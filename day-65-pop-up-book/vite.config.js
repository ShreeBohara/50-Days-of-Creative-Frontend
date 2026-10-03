import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves this day under a sub-path, so assets must resolve there.
export default defineConfig({
  plugins: [react()],
  base: '/50-Days-of-Creative-Frontend/day-65-pop-up-book/',
  test: {
    // Fold kinematics, spread validity, riso print engine — pure logic, no
    // DOM; spreads print and trace through @napi-rs/canvas (see setup).
    environment: 'node',
    setupFiles: ['./scripts/vitest-setup.mjs'],
    pool: 'forks',
  },
})
