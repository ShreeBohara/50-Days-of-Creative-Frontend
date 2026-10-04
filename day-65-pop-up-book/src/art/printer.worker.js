// The print shop, off the main thread: page turns never wait on a press run.
// Messages in: { id, kind: 'pages' | 'atlas' | 'cover' | 'template', spread, res, px }.
// Out: { id, ok, bitmaps } with ImageBitmaps transferred (a template replies
// { id, ok, blob } with a PNG), or { id, ok: false, error }.

import capra from '@fontsource/caprasimo/files/caprasimo-latin-400-normal.woff2?url'
import news from '@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2?url'
import newsIt from '@fontsource-variable/newsreader/files/newsreader-latin-wght-italic.woff2?url'
import mono from '@fontsource/fragment-mono/files/fragment-mono-latin-400-normal.woff2?url'
import { SPREADS } from '../spreads/index.js'
import { COVER } from '../spreads/cover.js'
import { compileSafe } from '../paper/spread.js'
import { printAtlas, printCover, printPages } from './jobs.js'
import { renderTemplate } from './template.js'

const supported = typeof OffscreenCanvas !== 'undefined' && !!self.fonts && typeof FontFace !== 'undefined'

const fontsReady = supported
  ? Promise.allSettled(
      [
        new FontFace('Caprasimo', `url(${capra})`),
        new FontFace('Newsreader Variable', `url(${news})`, { weight: '200 800' }),
        new FontFace('Newsreader Variable', `url(${newsIt})`, { weight: '200 800', style: 'italic' }),
        new FontFace('Fragment Mono', `url(${mono})`),
      ].map((f) => f.load().then((ff) => self.fonts.add(ff))),
    ).catch(() => {
      // a font that failed to load prints in a fallback face — still a book
    })
  : Promise.resolve()

const compiled = new Map()
const spread = (k) => {
  if (!compiled.has(k)) compiled.set(k, compileSafe(SPREADS[k]))
  return compiled.get(k)
}

self.postMessage({ hello: true, supported })

self.onmessage = async ({ data }) => {
  const { id, kind } = data
  try {
    await fontsReady
    let canvases
    if (kind === 'template') {
      const sp = spread(data.spread)
      const blob = await renderTemplate(sp, data.res ?? 100).convertToBlob({ type: 'image/png' })
      self.postMessage({ id, ok: true, blob })
      return
    }
    if (kind === 'pages') {
      const p = printPages(spread(data.spread), data.res)
      canvases = [p.L, p.R]
    } else if (kind === 'atlas') {
      canvases = [printAtlas(spread(data.spread), data.px)]
    } else if (kind === 'cover') {
      const c = printCover(COVER, data.res)
      canvases = [c.front, c.back]
    } else throw new Error(`unknown job ${kind}`)
    const bitmaps = canvases.map((c) => c.transferToImageBitmap())
    self.postMessage({ id, ok: true, bitmaps }, bitmaps)
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err?.stack ?? err) })
  }
}
