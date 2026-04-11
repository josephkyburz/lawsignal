/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks: {
          schools: ["./src/data/schools.js"],
        },
      },
    },
  },
  test: {
    include: ["src/**/__tests__/**/*.test.ts", "src/**/*.test.ts"],
    environment: "node",
    globals: false,
  },
});
