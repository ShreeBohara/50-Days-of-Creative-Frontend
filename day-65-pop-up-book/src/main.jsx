import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/caprasimo/latin-400.css'
import '@fontsource-variable/newsreader/wght.css'
import '@fontsource-variable/newsreader/wght-italic.css'
import '@fontsource/fragment-mono/latin-400.css'
import './index.css'

// No WebGL2 (or ?nowebgl=1) was decided by the inline gate in index.html: the
// static fallback is the whole page and the 3D book is never downloaded.
if (!document.documentElement.classList.contains('no-webgl')) {
  // die-cut outlines are traced from type, so the fonts must be in first
  const fonts = ['400 20px "Caprasimo"', '400 20px "Newsreader Variable"', 'italic 400 20px "Newsreader Variable"', '400 20px "Fragment Mono"']
  Promise.all(fonts.map((f) => document.fonts.load(f)))
    .catch(() => {})
    .then(() => import('./App.jsx'))
    .then(({ default: App }) => {
      createRoot(document.getElementById('root')).render(
        <StrictMode>
          <App />
        </StrictMode>,
      )
    })
}
