import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  optimizeDeps: {
    include: ["ag-grid-react", "ag-grid-community"],
  },
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
});
