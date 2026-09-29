import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Shippori Mincho only ever sets Latin here (the stage word), so skip its ~120
// Japanese unicode-range slices; the fallback page needs these fonts too.
import '@fontsource/shippori-mincho/latin-500.css'
import '@fontsource-variable/chivo-mono'
import './index.css'

// Tier D (no WebGL2) was decided by the inline gate in index.html; the static
// fallback page is already visible, so the 3D app is never even downloaded.
if (!document.documentElement.classList.contains('no-webgl')) {
  import('./App.jsx').then(({ default: App }) => {
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
}
