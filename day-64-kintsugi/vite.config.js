import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves this day under a sub-path, so assets must resolve there.
export default defineConfig({
  plugins: [react()],
  base: '/50-Days-of-Creative-Frontend/day-64-kintsugi/',
  test: {
    // Severity, seam graphs, fit rules, shelf codes — pure logic, no DOM.
    environment: 'node',
  },
})
