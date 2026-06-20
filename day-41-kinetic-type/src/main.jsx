import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Distinctive variable type — the raw material of the studio.
// `full` / `standard` ship every axis (not just weight) so the engine can
// drive opsz, SOFT and WONK alongside wght.
import '@fontsource-variable/fraunces/full.css' // opsz · wght · SOFT · WONK
import '@fontsource-variable/bricolage-grotesque/standard.css' // opsz · wght
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
