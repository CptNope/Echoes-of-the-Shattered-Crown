import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
export async function verifyAnimationArt(live = false, dist = false) {
  const characterSources = JSON.parse(
    await readFile(
      new URL("../src/character-sources.json", import.meta.url),
      "utf8",
    ),
  );
  const root = resolve(dist ? "dist" : "public");
  const site = process.env.PAGES_URL;
  const get = async (path) => {
    assert(!path.includes("..") && !path.startsWith("/"), "Unsafe art path");
    if (live) {
      assert(site, "PAGES_URL required");
      const r = await fetch(new URL(path, site), {
        signal: AbortSignal.timeout(20000),
        cache: "no-store",
      });
      assert(r.ok, path + " HTTP " + r.status);
      return Buffer.from(await r.arrayBuffer());
    }
    const p = resolve(root, path);
    assert(p.startsWith(root + sep));
    return readFile(p);
  };
  const m = JSON.parse((await get("art/animations/manifest.json")).toString());
  assert.equal(m.version, 1);
  assert.equal(m.columns, 4);
  assert.equal(m.rows, 8);
  assert.equal(m.framesPerState, 4);
  assert.deepEqual(m.states, [
    "idle",
    "walk",
    "attack",
    "cast",
    "hurt",
    "guard",
    "victory",
    "downed",
  ]);
  assert.deepEqual(
    Object.keys(m.sheets).sort(),
    [
      "vanguard",
      "dancer",
      "arcanist",
      "lifebinder",
      "shadowrunner",
      "runewarden",
      "stormherald",
      "chronoweaver",
      ...characterSources.map((s) => s.id),
    ].sort(),
  );
  const sharp = live ? null : (await import("sharp")).default;
  let total = 0;
  for (const [job, s] of Object.entries(m.sheets)) {
    assert.equal(s.file, "art/animations/" + job + ".webp");
    if (job.startsWith("custom-")) {
      const master = await get(`art/characters/${job}.png`);
      assert.equal(master.subarray(1, 4).toString(), "PNG");
      assert.equal(
        createHash("sha256").update(master).digest("hex"),
        s.sourceSha256,
      );
    }
    const b = await get(s.file);
    assert.equal(b.length, s.bytes);
    total += b.length;
    assert.equal(b.toString("ascii", 0, 4), "RIFF");
    assert.equal(b.toString("ascii", 8, 12), "WEBP");
    assert.equal(createHash("sha256").update(b).digest("hex"), s.sha256);
    for (const a of [s.ground, s.bounds, s.opaque, s.frameHashes])
      assert.equal(a.length, 32);
    assert.equal(
      new Set(s.frameHashes).size,
      32,
      job + " repeats identical frames",
    );
    assert(s.idleHeight > 0 && s.idleHeight <= 1);
    for (let i = 0; i < 32; i++) {
      assert(s.opaque[i] > 1000);
      assert(s.ground[i] > 0 && s.ground[i] < 1.01);
      assert.equal(s.bounds[i].length, 4);
    }
    if (sharp) {
      const { data, info } = await sharp(b)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      assert.equal(info.width, s.width);
      assert.equal(info.height, s.height);
      assert.equal(info.channels, 4);
      for (let i = 0; i < 32; i++) {
        const x0 = Math.round(((i % 4) * info.width) / 4),
          x1 = Math.round((((i % 4) + 1) * info.width) / 4);
        const y0 = Math.round((Math.floor(i / 4) * info.height) / 8),
          y1 = Math.round(((Math.floor(i / 4) + 1) * info.height) / 8);
        const cell = Buffer.alloc((x1 - x0) * (y1 - y0) * 4);
        let at = 0,
          opaque = 0;
        for (let y = y0; y < y1; y++)
          for (let x = x0; x < x1; x++) {
            const p = (y * info.width + x) * 4;
            data.copy(cell, at, p, p + 4);
            at += 4;
            if (data[p + 3] > 128) opaque++;
          }
        assert.equal(
          createHash("sha256").update(cell).digest("hex"),
          s.frameHashes[i],
        );
        assert.equal(opaque, s.opaque[i]);
      }
    }
  }
  console.log(
    `Verified ${Object.keys(m.sheets).length} sheets / ${Object.keys(m.sheets).length * 32} unique cells / ` +
      total +
      " bytes" +
      (live ? " on Pages" : " with decoded alpha and frame hashes"),
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  await verifyAnimationArt(
    process.argv.includes("--live"),
    process.argv.includes("--dist"),
  );
