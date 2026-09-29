// Public asset URLs, resolved against Vite's base so they work both on the dev
// server and under the GitHub Pages sub-path.

const BASE = import.meta.env.BASE_URL

export const url = (p) => `${BASE}${p}`

export const ASSETS = {
  bowl: url('models/bowl.glb'),
  trayTools: url('models/tray_tools.glb'),
  hdri: url('hdri/pine_attic_1k.hdr'),
  gobo: url('textures/shoji_gobo.png'),
  fracture: (id) => url(`models/fracture/${id}.glb`),
  seams: (id) => url(`data/seams/${id}.json`),
}
