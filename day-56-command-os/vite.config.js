import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves this day under a sub-path, so assets must resolve there.
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/50-Days-of-Creative-Frontend/day-56-command-os/',
  test: {
    // The fuzzy scorer is pure logic — no DOM needed.
    environment: 'node',
  },
})
