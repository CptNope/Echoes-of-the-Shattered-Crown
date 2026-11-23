import type { EffectAtlas } from "./combat-effects";
export interface EffectArt {
  image: HTMLImageElement;
  width: number;
  height: number;
}
const pending = new Map<EffectAtlas, Promise<EffectArt | null>>();
let manifest: Promise<any> | null = null;
export function loadEffectAtlas(id: EffectAtlas): Promise<EffectArt | null> {
  if (pending.has(id)) return pending.get(id)!;
  manifest ??= fetch(
    import.meta.env.BASE_URL +
      "art/effects/manifest.json?v=" +
      import.meta.env.VITE_EFFECT_ART_REVISION,
  )
    .then(async (r) => {
      if (!r.ok) throw Error("Effect manifest unavailable");
      const m = await r.json();
      if (
        m.version !== 1 ||
        m.columns !== 4 ||
        m.rows !== 8 ||
        m.framesPerClip !== 8
      )
        throw Error("Invalid effect grid");
      return m;
    })
    .catch(() => {
      manifest = null;
      return null;
    });
  const p = manifest
    .then(async (m) => {
      const metadata = m?.sheets?.[id];
      if (metadata?.file !== "art/effects/" + id + ".webp") return null;
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = reject;
        image.src =
          import.meta.env.BASE_URL + metadata.file + "?v=" + metadata.sha256;
      });
      if (
        image.naturalWidth !== metadata.width ||
        image.naturalHeight !== metadata.height
      )
        return null;
      return { image, width: metadata.width, height: metadata.height };
    })
    .catch(() => null)
    .then((art) => {
      if (!art) pending.delete(id);
      return art;
    });
  pending.set(id, p);
  return p;
}
