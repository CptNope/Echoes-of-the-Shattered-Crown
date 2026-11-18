import { jobs, type JobId } from "./data";
export const spriteWidth = 192,
  spriteHeight = 256;
const order: JobId[] = [
  "vanguard",
  "dancer",
  "arcanist",
  "lifebinder",
  "shadowrunner",
  "runewarden",
  "stormherald",
  "chronoweaver",
];
const cache = new Map<string, HTMLCanvasElement>();
let atlas: HTMLImageElement | null = null,
  pending: Promise<boolean> | null = null;
export function loadSpriteArt(): Promise<boolean> {
  if (atlas) return Promise.resolve(true);
  if (pending) return pending;
  pending = new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      atlas = image;
      cache.clear();
      resolve(true);
    };
    image.onerror = () => {
      pending = null;
      resolve(false);
    };
    image.src = import.meta.env.BASE_URL + "art/company-atlas.png";
  });
  return pending;
}
export function spriteCanvas(job: JobId, enemy = false): HTMLCanvasElement {
  const id = job + (enemy ? ":enemy" : ":ally");
  if (cache.has(id)) return cache.get(id)!;
  const c = document.createElement("canvas");
  c.width = spriteWidth;
  c.height = spriteHeight;
  const p = c.getContext("2d")!;
  if (!atlas) {
    p.imageSmoothingEnabled = false;
    p.drawImage(fallbackSprite(job, enemy), 0, 0, spriteWidth, spriteHeight);
    return c;
  }
  const cell = document.createElement("canvas"),
    i = order.indexOf(job),
    w = atlas.width / 4,
    h = atlas.height / 2;
  cell.width = w;
  cell.height = h;
  const cp = cell.getContext("2d")!;
  cp.drawImage(atlas, (i % 4) * w, Math.floor(i / 4) * h, w, h, 0, 0, w, h);
  // Read the alpha bounds so every class shares a baseline without cropping weapons.
  const pixels = cp.getImageData(0, 0, w, h).data;
  let left = w,
    right = 0,
    top = h,
    bottom = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (pixels[(y * w + x) * 4 + 3] > 24) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
  if (right <= left || bottom <= top) {
    p.drawImage(fallbackSprite(job, enemy), 0, 0, spriteWidth, spriteHeight);
    return c;
  }
  const bw = right - left + 1,
    bh = bottom - top + 1,
    scale = Math.min((spriteWidth - 8) / bw, (spriteHeight - 10) / bh),
    dw = bw * scale,
    dh = bh * scale;
  p.imageSmoothingEnabled = true;
  p.imageSmoothingQuality = "high";
  if (enemy) {
    p.translate(spriteWidth, 0);
    p.scale(-1, 1);
    p.filter = "saturate(.65) sepia(.18)";
  }
  p.drawImage(
    cell,
    left,
    top,
    bw,
    bh,
    (spriteWidth - dw) / 2,
    spriteHeight - 3 - dh,
    dw,
    dh,
  );
  p.setTransform(1, 0, 0, 1, 0, 0);
  p.filter = "none";
  if (enemy) {
    p.globalCompositeOperation = "source-atop";
    p.fillStyle = "rgba(154,65,49,.14)";
    p.fillRect(0, 0, spriteWidth, spriteHeight);
    p.globalCompositeOperation = "source-over";
  }
  cache.set(id, c);
  return c;
}
function fallbackSprite(job: JobId, enemy = false): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 42;
  const p = c.getContext("2d")!;
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    p.fillStyle = color;
    p.fillRect(x, y, w, h);
  };
  const ink = "#29352f",
    skin = "#e6bb8d",
    shade = "#b47f5c",
    cloth = enemy ? "#b26854" : jobs[job].color;
  rect(10, 35, 5, 5, ink);
  rect(19, 35, 5, 5, ink);
  rect(10, 34, 5, 3, "#766953");
  rect(19, 34, 5, 3, "#766953");
  rect(9, 20, 16, 15, ink);
  rect(10, 21, 14, 12, cloth);
  rect(11, 27, 12, 4, enemy ? "#7d443e" : "#576d5b");
  rect(11, 31, 5, 5, cloth);
  rect(19, 31, 4, 5, cloth);
  rect(6, 22, 5, 10, ink);
  rect(7, 23, 4, 7, cloth);
  rect(8, 30, 3, 3, skin);
  rect(24, 22, 4, 9, ink);
  rect(24, 23, 3, 6, cloth);
  rect(24, 29, 3, 3, skin);
  rect(10, 7, 14, 14, ink);
  rect(11, 8, 12, 12, skin);
  rect(11, 8, 12, 4, "#5d4939");
  rect(10, 10, 3, 7, "#5d4939");
  rect(21, 10, 3, 5, "#5d4939");
  rect(14, 14, 2, 2, ink);
  rect(20, 14, 2, 2, ink);
  rect(17, 17, 3, 2, shade);
  rect(14, 20, 7, 2, "#f1d7ae");
  rect(13, 22, 2, 8, "#e1d2a1");
  rect(21, 22, 2, 8, "#e1d2a1");
  rect(11, 29, 12, 2, "#574b3b");
  rect(16, 29, 3, 2, "#e6c66e");
  if (job === "vanguard" || job === "runewarden") {
    rect(9, 7, 16, 5, "#8a958b");
    rect(11, 5, 12, 3, "#b2b9a5");
    rect(10, 10, 3, 8, "#8a958b");
    rect(23, 10, 2, 8, "#8a958b");
    rect(15, 6, 3, 5, "#ece5cb");
    rect(5, 23, 9, 12, "#4e6259");
    rect(6, 24, 7, 9, cloth);
    rect(9, 24, 1, 9, "#f6da8c");
    rect(27, 15, 2, 15, "#d9e0cc");
    rect(26, 28, 4, 2, "#b49c60");
    rect(27, 30, 2, 4, "#786142");
  } else if (
    job === "arcanist" ||
    job === "stormherald" ||
    job === "chronoweaver"
  ) {
    rect(9, 19, 17, 4, cloth);
    rect(10, 21, 3, 10, cloth);
    rect(8, 7, 18, 3, ink);
    rect(10, 5, 14, 3, cloth);
    rect(12, 2, 9, 4, cloth);
    rect(14, 0, 5, 3, cloth);
    rect(11, 6, 11, 2, "#f0d49b");
    rect(27, 13, 2, 23, "#75664d");
    rect(25, 10, 6, 5, ink);
    rect(26, 9, 4, 5, enemy ? "#e49466" : "#a9e4d2");
    rect(27, 9, 2, 2, "#f5f3c9");
    rect(12, 33, 12, 4, cloth);
  } else if (job === "lifebinder") {
    rect(10, 5, 14, 5, "#d1d2ad");
    rect(8, 8, 4, 12, cloth);
    rect(23, 8, 3, 12, cloth);
    rect(10, 32, 15, 6, cloth);
    rect(16, 23, 3, 6, "#f8e7ac");
    rect(14, 25, 7, 2, "#f8e7ac");
    rect(27, 13, 2, 23, "#8c7957");
    rect(25, 12, 6, 3, "#d5dfae");
    rect(27, 9, 2, 8, "#d5dfae");
  } else {
    rect(10, 6, 14, 5, cloth);
    rect(9, 11, 3, 9, cloth);
    rect(11, 17, 12, 3, cloth);
    rect(23, 5, 4, 7, cloth);
    rect(27, 23, 2, 9, "#d6dfcf");
    rect(26, 31, 4, 2, "#a68a58");
    rect(5, 26, 2, 7, "#d6dfcf");
  }
  return c;
}
