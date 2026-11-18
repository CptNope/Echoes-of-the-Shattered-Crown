import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve, sep } from "node:path";

const base = process.env.BASE_PATH || "/Echoes-of-the-Shattered-Crown/";
const artPath = "art/company-atlas.png";
function verifyAtlas(bytes) {
  const b = Buffer.from(bytes);
  assert(
    b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    "Character atlas must be a PNG",
  );
  assert.equal(b.readUInt32BE(16), 1536, "Atlas width changed");
  assert.equal(b.readUInt32BE(20), 1024, "Atlas height changed");
  assert.equal(b[25], 6, "Atlas must preserve RGBA transparency");
}
assert(
  base.startsWith("/") && base.endsWith("/"),
  "BASE_PATH must start and end with /",
);

function assets(html) {
  assert(html.includes("Echoes of the Shattered Crown"), "Game title missing");
  assert(html.includes('id="root"'), "React mount point missing");
  const paths = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((path) => !/^(?:https?:|data:|#)/.test(path));
  assert(
    paths.some((path) => path.endsWith(".js")),
    "JavaScript entry missing",
  );
  assert(
    paths.some((path) => path.endsWith(".css")),
    "Stylesheet missing",
  );
  paths.forEach((path) =>
    assert(
      path.startsWith(`${base}assets/`),
      `Wrong Pages asset path: ${path}`,
    ),
  );
  return paths;
}

async function checkLocal() {
  const paths = assets(await readFile("dist/index.html", "utf8"));
  const root = resolve("dist");
  for (const path of paths) {
    const file = resolve(root, path.slice(base.length));
    assert(file.startsWith(root + sep), "Asset escapes build directory");
    assert((await stat(file)).size > 0, `Empty asset: ${path}`);
  }
  console.log(`Verified ${paths.length} built assets under ${base}`);
  verifyAtlas(await readFile(resolve(root, artPath)));
  console.log("Verified transparent character atlas");
}

async function checkLive() {
  assert(process.env.PAGES_URL, "PAGES_URL is required for live verification");
  const site = new URL(process.env.PAGES_URL);
  assert.equal(site.pathname, base, "Published URL does not match BASE_PATH");
  const htmlResponse = await fetch(site, {
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  assert(htmlResponse.ok, `Game HTML returned ${htmlResponse.status}`);
  assert(
    htmlResponse.headers.get("content-type")?.includes("text/html"),
    "Expected game HTML",
  );
  const paths = assets(await htmlResponse.text());
  for (const path of paths) {
    const response = await fetch(new URL(path, site), {
      signal: AbortSignal.timeout(20000),
    });
    assert(response.ok, `${path} returned ${response.status}`);
    assert(
      !response.headers.get("content-type")?.includes("text/html"),
      `Asset returned an HTML fallback: ${path}`,
    );
    assert(
      (await response.arrayBuffer()).byteLength > 0,
      `Empty deployed asset: ${path}`,
    );
  }
  console.log(`Verified live game and ${paths.length} assets at ${site}`);
  const artResponse = await fetch(new URL(artPath, site), {
    signal: AbortSignal.timeout(20000),
  });
  assert(artResponse.ok, `Character atlas returned ${artResponse.status}`);
  assert(
    artResponse.headers.get("content-type")?.includes("image/png"),
    "Atlas returned an unexpected content type",
  );
  verifyAtlas(await artResponse.arrayBuffer());
  console.log("Verified live character atlas");
}

if (process.argv.includes("--live")) {
  // The CDN may take a short time to publish the freshly deployed artifact.
  for (let attempt = 1; ; attempt++) {
    try {
      await checkLive();
      break;
    } catch (error) {
      if (attempt >= 6) throw error;
      console.log(`Pages not ready yet (${attempt}/6): ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
} else {
  await checkLocal();
}
