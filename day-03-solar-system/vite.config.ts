import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const productionBase = "/50-Days-of-Creative-Frontend/day-03-solar-system/";

export default defineConfig(({ command }) => ({
  base: command === "build" ? productionBase : "/",
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.includes("three") ||
              id.includes("@react-three/fiber") ||
              id.includes("@react-three/drei") ||
              id.includes("@react-three/postprocessing") ||
              id.includes("postprocessing")
            ) {
              return "scene";
            }

            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("/scheduler/") ||
              id.includes("/zustand/")
            ) {
              return "react";
            }

            if (id.includes("gsap") || id.includes("lenis")) {
              return "motion";
            }
          }

          return undefined;
        },
      },
    },
  },
}));
