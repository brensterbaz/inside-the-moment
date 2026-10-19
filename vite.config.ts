import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
    proxy: {
      "/api/analysis": { target: "http://127.0.0.1:5175", changeOrigin: true },
    },
  },
  preview: { host: "127.0.0.1", port: 4174, strictPort: true },
});
