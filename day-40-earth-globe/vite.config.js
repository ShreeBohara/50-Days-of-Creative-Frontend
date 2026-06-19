import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/50-Days-of-Creative-Frontend/day-40-earth-globe/',
  test: {
    environment: 'jsdom',
  },
})
