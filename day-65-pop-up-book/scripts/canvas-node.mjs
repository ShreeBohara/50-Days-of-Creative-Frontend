// Node canvas setup shared by the preview script and the tests: the riso
// print engine and the outline tracer draw through whatever canvas factory is
// installed, so in node that's @napi-rs/canvas with the book's three fonts.

import { createCanvas, GlobalFonts, Path2D } from '@napi-rs/canvas'
import { fileURLToPath } from 'node:url'
import { setCanvasFactory } from '../src/art/riso.js'

const here = (p) => fileURLToPath(new URL(p, import.meta.url))

let ready = false
export function installNodeCanvas() {
  if (ready) return
  ready = true
  globalThis.Path2D = Path2D
  setCanvasFactory((w, h) => createCanvas(w, h))
  const fonts = [
    ['../node_modules/@fontsource/caprasimo/files/caprasimo-latin-400-normal.woff2', 'Caprasimo'],
    ['../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2', 'Newsreader Variable'],
    ['../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-italic.woff2', 'Newsreader Variable'],
    ['../node_modules/@fontsource/fragment-mono/files/fragment-mono-latin-400-normal.woff2', 'Fragment Mono'],
  ]
  for (const [file, family] of fonts) GlobalFonts.registerFromPath(here(file), family)
}

export { createCanvas }
