// Duotone inks for the plotted line + matching glow, tuned for the ink ground.

export interface Palette {
  id: string
  name: string
  from: string
  to: string
  glow: string
}

export const PALETTES: Palette[] = [
  { id: 'brass-verdigris', name: 'Brass & Verdigris', from: '#f4c66a', to: '#6fd8c8', glow: '#7fe0d0' },
  { id: 'ember', name: 'Ember Filament', from: '#ffd27a', to: '#ef6b4f', glow: '#ff8a5c' },
  { id: 'aurora', name: 'Aurora', from: '#8ff0e0', to: '#9d8cff', glow: '#9bb6ff' },
  { id: 'phosphor', name: 'Phosphor', from: '#c8ff8a', to: '#3ad6a0', glow: '#7dff9e' },
  { id: 'rose-gold', name: 'Rose Gold', from: '#ffc2a8', to: '#e57ba0', glow: '#ff9bc0' },
  { id: 'ink-silver', name: 'Ink & Silver', from: '#dfe7f5', to: '#8aa0c8', glow: '#b8c8e6' },
]

export const DEFAULT_PALETTE = PALETTES[0]

export function getPalette(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? DEFAULT_PALETTE
}
