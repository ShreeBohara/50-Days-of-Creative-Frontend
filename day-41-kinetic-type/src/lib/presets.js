/**
 * A scene bundles a complete look: variable font, palette, default headline,
 * behavior and parameters. Palettes set only the four base tokens — the rest
 * derive via color-mix in index.css.
 */
export const SCENES = [
  {
    id: 'manifesto',
    name: 'Manifesto',
    font: 'fraunces',
    headline: 'Bend the type',
    behavior: 'magnet',
    params: { radius: 300, intensity: 1, baseWeight: 340, size: 1 },
    palette: { paper: '#ece7d9', ink: '#15140f', accent: '#ff3d00', accent2: '#1b2be8' },
  },
  {
    id: 'press',
    name: 'Press',
    font: 'fraunces',
    headline: 'Stop the press',
    behavior: 'gravity',
    params: { radius: 300, intensity: 1.15, baseWeight: 360, size: 1 },
    palette: { paper: '#e9e6dd', ink: '#16161a', accent: '#1b2be8', accent2: '#d11507' },
  },
  {
    id: 'bloom',
    name: 'Bloom',
    font: 'fraunces',
    headline: 'Soft serve',
    behavior: 'ripple',
    params: { radius: 340, intensity: 1, baseWeight: 300, size: 1.06 },
    palette: { paper: '#f1e6df', ink: '#2a1c18', accent: '#e0613c', accent2: '#b9823a' },
  },
  {
    id: 'nocturne',
    name: 'Nocturne',
    font: 'bricolage',
    headline: 'After hours',
    behavior: 'spotlight',
    params: { radius: 260, intensity: 1.1, baseWeight: 300, size: 1.05 },
    palette: { paper: '#14151a', ink: '#ede9df', accent: '#ff5c8a', accent2: '#5b8cff' },
    dark: true,
  },
  {
    id: 'acid',
    name: 'Acid',
    font: 'bricolage',
    headline: 'System error',
    behavior: 'glitch',
    params: { radius: 240, intensity: 1.4, baseWeight: 420, size: 1 },
    palette: { paper: '#0c0d0b', ink: '#f2f2ec', accent: '#c7f93a', accent2: '#ff39c3' },
    dark: true,
  },
  {
    id: 'signal',
    name: 'Signal',
    font: 'bricolage',
    headline: 'Broadcast',
    behavior: 'stagger',
    params: { radius: 300, intensity: 1, baseWeight: 320, size: 1.05 },
    palette: { paper: '#07151a', ink: '#e6fbff', accent: '#19e3c2', accent2: '#ff5d8f' },
    dark: true,
  },
]

export const getScene = (id) => SCENES.find((s) => s.id === id) || SCENES[0]

export const fontStack = (font) =>
  font === 'bricolage'
    ? "'Bricolage Grotesque Variable', system-ui, sans-serif"
    : "'Fraunces Variable', 'Times New Roman', serif"

export const fontLabel = (font) =>
  font === 'bricolage'
    ? 'Bricolage Grotesque · opsz 12–96 · wght 200–800'
    : 'Fraunces Variable · opsz 9–144 · wght 100–900'

export const fontName = (font) =>
  font === 'bricolage' ? 'Bricolage Grotesque' : 'Fraunces Variable'
