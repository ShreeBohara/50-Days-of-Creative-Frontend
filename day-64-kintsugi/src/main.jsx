import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/shippori-mincho/500.css'
import '@fontsource-variable/chivo-mono'
import './index.css'
import App from './App.jsx'

// Tier D (no WebGL2) was decided by the inline gate in index.html; the static
// fallback page is already visible, so React never mounts.
if (!document.documentElement.classList.contains('no-webgl')) {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
