import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const productionBase = '/50-Days-of-Creative-Frontend/day-22-3d-configurator/'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? productionBase : '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three') || id.includes('@react-three')) {
              return 'three-vendor'
            }
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/scheduler/')
            ) {
              return 'react'
            }
          }
          return undefined
        },
      },
    },
  },
}))
