import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves this day under a sub-path, so assets must resolve there.
export default defineConfig({
  plugins: [react()],
  base: '/50-Days-of-Creative-Frontend/day-65-pop-up-book/',
  build: {
    // three, the renderer stack and the book's printed content change at
    // different rates: separate chunks download in parallel and stay cached
    // across redeploys of the app code
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\\/]three[\\/]/, priority: 30 },
            { name: 'render', test: /node_modules[\\/](@react-three|postprocessing|react|react-dom|scheduler|zustand|its-fine|suspend-react)[\\/]/, priority: 20 },
            // the contents (chapters + days) are all the no-WebGL page needs
            { name: 'contents', test: /src[\\/](data[\\/]days|spreads[\\/]chapters)\.js$/, priority: 15 },
            { name: 'spreads', test: /src[\\/]spreads[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
  test: {
    // Fold kinematics, spread validity, riso print engine — pure logic, no
    // DOM; spreads print and trace through @napi-rs/canvas (see setup).
    environment: 'node',
    setupFiles: ['./scripts/vitest-setup.mjs'],
    pool: 'forks',
  },
})
