import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const clientRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: clientRoot,
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    port: 5173,
    watch: {
      ignored: [
        "**/.git/**",
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/.next/**",
        "**/coverage/**",
        "**/.cache/**",
        "**/.vite/**",
        "**/.turbo/**",
        "**/artifacts/**",
        "**/data/**",
        "**/data-test/**",
        "**/*.tsbuildinfo"
      ]
    }
  },
  optimizeDeps: {
    exclude: ["@bing/shared"]
  },
  build: {
    outDir: "dist"
  }
});
