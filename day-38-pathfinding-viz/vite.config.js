import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/50-Days-of-Creative-Frontend/day-38-pathfinding-viz/',
  test: {
    environment: 'node',
  },
})

