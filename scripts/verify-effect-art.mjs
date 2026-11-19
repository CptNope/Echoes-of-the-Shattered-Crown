import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
export async function verifyEffectArt(live = false, dist = false) {
  const root = resolve(dist ? "dist" : "public"),
    get = async (path) => {
      assert(!path.includes("..") && !path.startsWith("/"));
      if (live) {
        assert(process.env.PAGES_URL);
        const r = await fetch(new URL(path, process.env.PAGES_URL), {
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
  const hash = (b) => createHash("sha256").update(b).digest("hex"),
    m = JSON.parse((await get("art/effects/manifest.json")).toString());
  assert.equal(m.version, 1);
  assert.equal(m.columns, 4);
  assert.equal(m.rows, 8);
  assert.equal(m.framesPerClip, 8);
  const names = {
    martial: ["strike", "cleave", "gloam", "concord"],
    elements: ["fire", "ice", "lightning", "rain"],
    support: ["heal", "shield", "time", "veil"],
  };
  assert.deepEqual(Object.keys(m.sheets).sort(), Object.keys(names).sort());
  const sharp = live ? null : (await import("sharp")).default;
  let total = 0;
  for (const [id, clips] of Object.entries(names)) {
    const s = m.sheets[id];
    assert.equal(s.file, "art/effects/" + id + ".webp");
    assert.deepEqual(s.clips, clips);
    assert.equal(s.frameHashes.length, 32);
    assert.equal(s.opaque.length, 32);
    assert.equal(new Set(s.frameHashes).size, 32);
    const b = await get(s.file);
    total += b.length;
    assert.equal(b.length, s.bytes);
    assert.equal(hash(b), s.sha256);
    assert.equal(b.toString("ascii", 0, 4), "RIFF");
    assert.equal(b.toString("ascii", 8, 12), "WEBP");
    assert(s.opaque.every((n) => Number.isInteger(n) && n >= 10));
    assert.match(s.sourceSha256, /^[a-f0-9]{64}$/);
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
          x1 = Math.round((((i % 4) + 1) * info.width) / 4),
          y0 = Math.round((Math.floor(i / 4) * info.height) / 8),
          y1 = Math.round(((Math.floor(i / 4) + 1) * info.height) / 8),
          parts = [];
        let count = 0;
        for (let y = y0; y < y1; y++) {
          parts.push(
            data.subarray((y * info.width + x0) * 4, (y * info.width + x1) * 4),
          );
          for (let x = x0; x < x1; x++)
            if (data[(y * info.width + x) * 4 + 3] > 128) count++;
        }
        assert.equal(hash(Buffer.concat(parts)), s.frameHashes[i]);
        assert.equal(count, s.opaque[i]);
      }
    }
  }
  console.log(
    "Verified 3 effect atlases / 96 unique frames / " +
      total +
      " bytes" +
      (live ? " on Pages" : " with decoded alpha"),
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  await verifyEffectArt(
    process.argv.includes("--live"),
    process.argv.includes("--dist"),
  );
