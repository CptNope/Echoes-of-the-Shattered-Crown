import { loadAnimationManifest } from "./animation-art";
import type { JobId } from "./data";
import type { LoadedAnimationSheet } from "./animation-art";
import {
  applyNativePatches,
  nativeSource,
  validateNativeSprite,
  type NativeSprite,
} from "./studio-native-sprites";
export async function importGameSprite(job: JobId, actorId: string) {
  const manifest = await loadAnimationManifest(),
    metadata = manifest?.sheets[job];
  if (!metadata)
    throw Error("Character manifest unavailable. Try loading again.");
  const response = await fetch(import.meta.env.BASE_URL + metadata.file);
  if (!response.ok) throw Error("Character sheet unavailable.");
  const bytes = await response.arrayBuffer();
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (n) => n.toString(16).padStart(2, "0"),
  ).join("");
  if (hash !== metadata.sha256)
    throw Error("Original sheet digest does not match the game manifest.");
  const image = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(Error("Cannot read original sheet."));
    reader.readAsDataURL(new Blob([bytes], { type: "image/webp" }));
  });
  return nativeSource(job, actorId, metadata, image);
}
export async function decodeNativeSprite(source: NativeSprite) {
  const p = validateNativeSprite(source);
  const binary = atob(p.image.split(",")[1]),
    bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const digest = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (n) => n.toString(16).padStart(2, "0"),
  ).join("");
  if (digest !== p.sha256)
    throw Error("Embedded original sheet digest does not match source.");
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(Error("Embedded character sheet cannot be decoded."));
    image.src = p.image;
  });
  if (image.naturalWidth !== p.width || image.naturalHeight !== p.height)
    throw Error("Embedded character sheet dimensions differ from source.");
  const canvas = document.createElement("canvas");
  canvas.width = p.width;
  canvas.height = p.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, p.width, p.height).data;
}
export function nativeCanvas(source: NativeSprite, base: Uint8ClampedArray) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  canvas
    .getContext("2d")!
    .putImageData(
      new ImageData(
        applyNativePatches(base, source),
        source.width,
        source.height,
      ),
      0,
      0,
    );
  return canvas;
}
export async function loadNativeSheet(
  p: NativeSprite,
): Promise<LoadedAnimationSheet> {
  const canvas = nativeCanvas(p, await decodeNativeSprite(p));
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(Error("Native sheet compilation failed."));
    image.src = canvas.toDataURL("image/png");
  });
  return {
    image,
    metadata: {
      file: "embedded-native-source",
      width: p.width,
      height: p.height,
      bytes: 0,
      sha256: p.sha256,
      sourceSha256: p.sha256,
      idleHeight: p.idleHeight,
      ground: p.ground,
      bounds: [],
      opaque: [],
      frameHashes: [],
    },
  };
}
