// ============================================================
// Color themes — three spectral gradients for the blob.
// low = where bass-heavy sound sits, high = where treble goes.
// The UI accents follow along via CSS custom properties.
// ============================================================

import { Color } from 'three'
import { useSyncExternalStore } from 'react'

const make = (id, name, low, mid, high, accent, accent2) => ({
  id,
  name,
  low,
  mid,
  high,
  accent,
  accent2,
  lowColor: new Color(low),
  midColor: new Color(mid),
  highColor: new Color(high),
})

export const THEMES = [
  make('ember', 'EMBER', '#ff3d1f', '#8a4dff', '#4fd8ff', '#ff5c33', '#8c5cff'),
  make('toxic', 'TOXIC', '#9ded1f', '#1fd97c', '#f23dff', '#a8e534', '#f23dff'),
  make('glacier', 'GLACIER', '#3b2bff', '#4fc3ff', '#ffd6f2', '#4fc3ff', '#c99cff'),
]

export const themeState = { current: THEMES[0] }

let version = 0
const listeners = new Set()

export function setTheme(theme) {
  themeState.current = theme
  // UI chrome follows the blob — setProperty, never Object.assign,
  // for CSS custom properties
  const root = document.documentElement
  root.style.setProperty('--accent', theme.accent)
  root.style.setProperty('--accent-2', theme.accent2)
  version += 1
  listeners.forEach((fn) => fn())
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useTheme() {
  useSyncExternalStore(subscribe, () => version)
  return themeState.current
}
