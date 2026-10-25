import { defineConfig } from "vite";

// GitHub Pages serves the app from /RemoveAndroidAI/, so asset URLs must be relative.
export default defineConfig({
  root: "web",
  base: "./",
  build: { target: "es2022", outDir: "../dist/web", emptyOutDir: true },
});
