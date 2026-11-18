import { defineConfig } from "vite";

// GitHub Pages hosts project sites below the repository name. Other hosts
// and local development keep the default root path.
export default defineConfig({
  base: process.env.BASE_PATH || "/",
});
