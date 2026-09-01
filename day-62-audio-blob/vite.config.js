import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves this day under a sub-path, so assets must resolve there.
export default defineConfig({
  plugins: [react()],
  base: '/50-Days-of-Creative-Frontend/day-62-audio-blob/',
  test: {
    // Band bucketing, envelopes, and synth note math are pure logic — no DOM needed.
    environment: 'node',
  },
})
