import { defineConfig } from "vite";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// A new manifest must never reuse a previous release's browser/CDN cache key.
const artworkRevision = createHash("sha256")
  .update(
    readFileSync(
      new URL("./public/art/animations/manifest.json", import.meta.url),
    ),
  )
  .digest("hex");

const effectRevision = createHash("sha256")
  .update(
    readFileSync(
      new URL("./public/art/effects/manifest.json", import.meta.url),
    ),
  )
  .digest("hex");

// GitHub Pages hosts project sites below the repository name. Other hosts
// and local development keep the default root path.
export default defineConfig({
  base: process.env.BASE_PATH || "/",
  define: {
    "import.meta.env.VITE_EFFECT_ART_REVISION": JSON.stringify(effectRevision),
    "import.meta.env.VITE_CHARACTER_ART_REVISION":
      JSON.stringify(artworkRevision),
  },
  build: {
    rollupOptions: {
      input: {
        game: "index.html",
        animations: "animation-review.html",
        studio: "studio.html",
      },
    },
  },
});
