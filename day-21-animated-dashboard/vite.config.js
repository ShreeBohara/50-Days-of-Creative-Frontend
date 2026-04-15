import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const productionBase = '/50-Days-of-Creative-Frontend/day-21-animated-dashboard/'

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
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'charts'
            }
            if (id.includes('framer-motion')) {
              return 'motion'
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
