import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Distinctive variable type — the raw material of the studio.
import '@fontsource-variable/fraunces' // opsz · wght · SOFT · WONK · slnt
import '@fontsource-variable/bricolage-grotesque' // opsz · wght
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/700.css'

import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
