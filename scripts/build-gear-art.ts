import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { equipment } from "../src/equipment";
import { items } from "../src/items";
// IDs follow the immutable row-major order requested in gear-master-v1.prompt.txt.
const ids = [
  "custom-watch-spear",
  "custom-duelist-rapier",
  "custom-runic-maul",
  "custom-storm-focus",
  "custom-healers-crook",
  "custom-scout-coat",
  "custom-channeler-robes",
  "custom-bastion-plate",
  "custom-trail-vest",
  "custom-iron-signet",
  "custom-ember-pendant",
  "custom-heartwood-token",
  "crownseal",
  "ironblade",
  "twinsteel",
  "cedarrod",
  "willowstaff",
  "leather",
  "lamellar",
  "wayboots",
  "copperfocus",
  "watchcharm",
  "field-tonic",
  "vital-tonic",
  "ether-draught",
  "deep-ether",
  "cleansing-salts",
  "phoenix-seed",
];
const bytes = await readFile("public/art/gear/gear-master-v1.png"),
  meta = await sharp(bytes).metadata();
if (
  !meta.width ||
  !meta.height ||
  meta.width % 7 ||
  meta.height % 4 ||
  meta.width / 7 !== meta.height / 4 ||
  !meta.hasAlpha
)
  throw Error("Expected a transparent 7 × 4 square-cell atlas.");
const cell = meta.width / 7,
  catalog = { ...equipment, ...items },
  sources: Record<
    string,
    { name: string; palette: string[]; pixels: number[] }
  > = {},
  tiles: sharp.OverlayOptions[] = [];
for (const [i, id] of ids.entries()) {
  const cellPixels = await sharp(bytes)
    .extract({
      left: (i % 7) * cell,
      top: Math.floor(i / 7) * cell,
      width: cell,
      height: cell,
    })
    .resize(56, 56, { kernel: "nearest" })
    .extend({
      top: 4,
      bottom: 4,
      left: 4,
      right: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer();
  // The robe hem touches this cell's top edge; exclude its two-row bleed while
  // preserving the sword pommel at the upper right.
  if (id === "ironblade")
    for (let y = 4; y < 6; y++)
      for (let x = 4; x < 49; x++)
        cellPixels.fill(0, (y * 64 + x) * 4, (y * 64 + x) * 4 + 4);
  // Generated atlas silhouettes can cross a cell edge. Drop tiny disconnected
  // fragments after extraction; retain large separate parts such as both boots.
  const visited = new Uint8Array(4096),
    components: number[][] = [];
  for (let n = 0; n < 4096; n++) {
    if (visited[n] || !cellPixels[n * 4 + 3]) continue;
    const component = [n];
    visited[n] = 1;
    for (let q = 0; q < component.length; q++) {
      const at = component[q],
        x = at % 64,
        y = Math.floor(at / 64);
      for (let dz = -1; dz <= 1; dz++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx,
            yy = y + dz,
            next = yy * 64 + xx;
          if (
            xx < 0 ||
            xx >= 64 ||
            yy < 0 ||
            yy >= 64 ||
            visited[next] ||
            !cellPixels[next * 4 + 3]
          )
            continue;
          visited[next] = 1;
          component.push(next);
        }
    }
    components.push(component);
  }
  const largest = Math.max(...components.map((c) => c.length));
  for (const component of components)
    if (component.length < largest * 0.08)
      for (const n of component) cellPixels.fill(0, n * 4, n * 4 + 4);
  const png = await sharp(cellPixels, {
    raw: { width: 64, height: 64, channels: 4 },
  })
    .png({ palette: true, colours: 64, dither: 0 })
    .toBuffer();
  const raw = await sharp(png).ensureAlpha().raw().toBuffer(),
    palette = ["#00000000"],
    pixels: number[] = [];
  for (let n = 0; n < 4096; n++) {
    const c =
      raw[n * 4 + 3] === 0
        ? "#00000000"
        : "#" + raw.subarray(n * 4, n * 4 + 4).toString("hex");
    let p = palette.indexOf(c);
    if (p < 0) {
      p = palette.length;
      palette.push(c);
    }
    pixels.push(p);
  }
  sources[id] = {
    name: catalog[id as keyof typeof catalog].name,
    palette,
    pixels,
  };
  tiles.push({ input: png, left: (i % 7) * 64, top: Math.floor(i / 7) * 64 });
}
await writeFile("src/gear-art-source.json", JSON.stringify(sources));
await sharp({
  create: {
    width: 448,
    height: 256,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(tiles)
  .png()
  .toFile("public/art/gear/gear-icons-v1.png");
await writeFile(
  "public/art/gear/manifest.json",
  JSON.stringify(
    {
      version: 1,
      columns: 7,
      rows: 4,
      cellSize: 64,
      ids,
      masterSha256: createHash("sha256").update(bytes).digest("hex"),
      atlasSha256: createHash("sha256")
        .update(await readFile("public/art/gear/gear-icons-v1.png"))
        .digest("hex"),
    },
    null,
    2,
  ) + "\n",
);
console.log("Built 28 editable 64 × 64 gear and supply icons.");
