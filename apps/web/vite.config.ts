import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      "/health": "http://127.0.0.1:3000",
      "/api": "http://127.0.0.1:3000",
    },
  },
});
