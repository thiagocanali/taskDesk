import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.spec.ts"],
  },
  server: {
    port: 5173,
    proxy: {
      "/health": "http://127.0.0.1:3000",
      "/api": "http://127.0.0.1:3000",
    },
  },
});
