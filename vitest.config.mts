import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import path from "path";

const rootDir = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    exclude: [
      "node_modules",
      "dist",
      ".next",
      "**/_backup_*/**",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDir),
    },
  },
});
