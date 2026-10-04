import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

/** Mount the 3D book (only reached when WebGL2 is available). */
export function boot(el) {
  createRoot(el).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
