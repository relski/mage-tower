import { defineConfig } from "vite";

// "./" makes every built URL relative, so the game works from any folder, including the
// /mage-tower/ path that GitHub Pages serves it from.
export default defineConfig({
  base: "./",
});
