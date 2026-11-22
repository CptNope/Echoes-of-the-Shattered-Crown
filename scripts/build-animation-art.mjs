import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
const jobs = [
  "vanguard",
  "dancer",
  "arcanist",
  "lifebinder",
  "shadowrunner",
  "runewarden",
  "stormherald",
  "chronoweaver",
  "custom-glass-ranger",
  "custom-ash-cantor",
];
const root = resolve("public/art/animations"),
  source = resolve(
    process.argv.slice(2).find((a) => !a.startsWith("--")) ??
      "../echoes-animation-masters",
  );
await mkdir(root, { recursive: true });
const hash = (b) => createHash("sha256").update(b).digest("hex");
const manifest = process.argv.includes("--characters-only")
  ? JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8"))
  : {
      version: 1,
      columns: 4,
      rows: 8,
      framesPerState: 4,
      states: [
        "idle",
        "walk",
        "attack",
        "cast",
        "hurt",
        "guard",
        "victory",
        "downed",
      ],
      sheets: {},
    };
for (const job of jobs.filter(
  (j) => !process.argv.includes("--characters-only") || j.startsWith("custom-"),
)) {
  const png = await readFile(
    resolve(
      job.startsWith("custom-") ? "public/art/characters" : source,
      job + ".png",
    ),
  );
  await sharp(png)
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(resolve(root, job + ".webp"));
  const webp = await readFile(resolve(root, job + ".webp")),
    { data, info } = await sharp(webp)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
  const cw = info.width / 4,
    ch = info.height / 8,
    ground = [],
    bounds = [],
    opaque = [],
    frameHashes = [];
  for (let row = 0; row < 8; row++)
    for (let col = 0; col < 4; col++) {
      const x0 = Math.round(col * cw),
        x1 = Math.round((col + 1) * cw),
        y0 = Math.round(row * ch),
        y1 = Math.round((row + 1) * ch);
      let left = cw,
        right = 0,
        top = ch,
        bottom = 0,
        foot = 0,
        count = 0;
      const bytes = [];
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          const i = (y * info.width + x) * 4,
            a = data[i + 3];
          if (a > 128) {
            count++;
            left = Math.min(left, x - x0);
            right = Math.max(right, x - x0);
            top = Math.min(top, y - y0);
            bottom = Math.max(bottom, y - y0);
            if (x - x0 > cw * 0.24 && x - x0 < cw * 0.76)
              foot = Math.max(foot, y - y0);
          }
          bytes.push(data[i], data[i + 1], data[i + 2], a);
        }
      if (count < 1000)
        throw new Error(
          job + " frame " + (row * 4 + col) + " is empty or too faint",
        );
      ground.push(Number(((foot || bottom) + 1) / ch).toFixed(6) * 1);
      bounds.push([left, top, right, bottom].map((n) => Math.round(n)));
      opaque.push(count);
      frameHashes.push(hash(Buffer.from(bytes)));
    }
  const heights = bounds
      .slice(0, 4)
      .map((b) => (b[3] - b[1] + 1) / ch)
      .sort((a, b) => a - b),
    idleHeight = (heights[1] + heights[2]) / 2;
  manifest.sheets[job] = {
    file: "art/animations/" + job + ".webp",
    width: info.width,
    height: info.height,
    bytes: webp.length,
    sha256: hash(webp),
    sourceSha256: hash(png),
    idleHeight: Number(idleHeight.toFixed(6)),
    ground,
    bounds,
    opaque,
    frameHashes,
  };
  console.log(
    job +
      ": " +
      info.width +
      "x" +
      info.height +
      ", " +
      Math.round(webp.length / 1024) +
      " KiB, 32 frames",
  );
}
await writeFile(
  resolve(root, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
