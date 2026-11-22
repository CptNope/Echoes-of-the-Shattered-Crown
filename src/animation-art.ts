import type { JobId } from "./data";
import type { AnimationManifest, AnimationSheet } from "./animation";
const revision = "characters-2";
let manifestPromise: Promise<AnimationManifest | null> | null = null;
export interface LoadedAnimationSheet {
  image: HTMLImageElement;
  metadata: AnimationSheet;
}
const sheets = new Map<JobId, Promise<LoadedAnimationSheet | null>>();
export function loadAnimationManifest(): Promise<AnimationManifest | null> {
  if (!manifestPromise)
    manifestPromise = fetch(
      import.meta.env.BASE_URL + "art/animations/manifest.json?v=" + revision,
    )
      .then(async (r) => {
        if (!r.ok) throw Error("Animation manifest unavailable");
        const m = (await r.json()) as AnimationManifest;
        if (
          m.version !== 1 ||
          m.columns !== 4 ||
          m.rows !== 8 ||
          m.framesPerState !== 4
        )
          throw Error("Animation manifest incompatible");
        return m;
      })
      .catch(() => {
        manifestPromise = null;
        return null;
      });
  return manifestPromise;
}
export function loadAnimationSheet(
  job: JobId,
): Promise<LoadedAnimationSheet | null> {
  if (sheets.has(job)) return sheets.get(job)!;
  const pending = loadAnimationManifest().then(
    (m) =>
      new Promise<LoadedAnimationSheet | null>((resolve) => {
        const metadata = m?.sheets?.[job];
        if (
          !metadata ||
          typeof metadata.file !== "string" ||
          !metadata.file.startsWith("art/animations/") ||
          metadata.file.includes("..") ||
          !Array.isArray(metadata.ground) ||
          metadata.ground.length !== 32 ||
          !metadata.ground.every(Number.isFinite) ||
          !Number.isFinite(metadata.idleHeight) ||
          metadata.idleHeight <= 0
        ) {
          sheets.delete(job);
          resolve(null);
          return;
        }
        const image = new Image();
        image.onload = () => {
          if (
            image.naturalWidth !== metadata.width ||
            image.naturalHeight !== metadata.height
          ) {
            sheets.delete(job);
            resolve(null);
          } else resolve({ image, metadata });
        };
        image.onerror = () => {
          sheets.delete(job);
          resolve(null);
        };
        image.src = import.meta.env.BASE_URL + metadata.file + "?v=" + revision;
      }),
  );
  sheets.set(job, pending);
  return pending;
}
