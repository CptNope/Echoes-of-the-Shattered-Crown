import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
const hash = (b) => createHash("sha256").update(b).digest("hex");
const source = resolve(process.argv[2] ?? "../echoes-effect-masters"),
  root = resolve("public/art/effects");
await mkdir(root, { recursive: true });
const names = {
  martial: ["strike", "cleave", "gloam", "concord"],
  elements: ["fire", "ice", "lightning", "rain"],
  support: ["heal", "shield", "time", "veil"],
};
const m = { version: 1, columns: 4, rows: 8, framesPerClip: 8, sheets: {} };
for (const [id, clips] of Object.entries(names)) {
  const png = await readFile(resolve(source, id + ".png"));
  await sharp(png)
    .webp({ quality: 92, alphaQuality: 100, effort: 6 })
    .toFile(resolve(root, id + ".webp"));
  const bytes = await readFile(resolve(root, id + ".webp")),
    { data, info } = await sharp(bytes)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
  const hashes = [],
    opaque = [];
  for (let i = 0; i < 32; i++) {
    const x0 = Math.round(((i % 4) * info.width) / 4),
      x1 = Math.round((((i % 4) + 1) * info.width) / 4),
      y0 = Math.round((Math.floor(i / 4) * info.height) / 8),
      y1 = Math.round(((Math.floor(i / 4) + 1) * info.height) / 8);
    const parts = [];
    let count = 0;
    for (let y = y0; y < y1; y++) {
      parts.push(
        data.subarray((y * info.width + x0) * 4, (y * info.width + x1) * 4),
      );
      for (let x = x0; x < x1; x++)
        if (data[(y * info.width + x) * 4 + 3] > 128) count++;
    }
    if (count < 10) throw Error(id + " empty frame " + i);
    hashes.push(hash(Buffer.concat(parts)));
    opaque.push(count);
  }
  m.sheets[id] = {
    file: "art/effects/" + id + ".webp",
    width: info.width,
    height: info.height,
    bytes: bytes.length,
    sha256: hash(bytes),
    sourceSha256: hash(png),
    clips,
    frameHashes: hashes,
    opaque,
  };
  console.log(id, info.width, info.height, bytes.length, Math.min(...opaque));
}
await writeFile(
  resolve(root, "manifest.json"),
  JSON.stringify(m, null, 2) + "\n",
);
