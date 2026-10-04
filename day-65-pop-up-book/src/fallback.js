// The book without WebGL: the same contents as a plain, accessible page —
// every chapter and every one of the 64 days, each linking to its live demo.
// Built with DOM calls (no framework, no WebGL) from the book's own data.

import { CHAPTERS } from './spreads/chapters.js'
import { DAYS } from './data/days.js'

const byN = new Map(DAYS.map((d) => [d.n, d]))
const el = (tag, props = {}, ...kids) => {
  const n = document.createElement(tag)
  Object.assign(n, props)
  for (const k of kids) n.append(k)
  return n
}

/**
 * Show the static notice at once (no download needed), with a reason. Called
 * by the safety nets before they try to fetch the full contents list.
 */
export function showNotice(reason) {
  document.documentElement.classList.add('no-webgl')
  const note = document.querySelector('.fallback__why')
  if (note && reason) note.textContent = reason
}

export function renderFallback(reason) {
  const main = document.querySelector('.fallback')
  if (!main || main.dataset.built) return
  main.dataset.built = '1'
  showNotice(reason)
  main.querySelector('.fallback__lead')?.append(' Below is its contents — every day links to its live demo.')
  main.append(
    el('img', {
      className: 'fallback__shot',
      src: `${import.meta.env.BASE_URL}og.jpg`,
      alt: 'The opening spread of the pop-up book: a die-cut 65 standing in front of a pink and yellow sunburst.',
      width: 1200,
      height: 630,
    }),
  )
  const list = el('ol', { className: 'fallback__chapters' })
  for (const c of CHAPTERS) {
    const days = el('ul', { className: 'fallback__days' })
    for (const n of c.days) {
      const d = byN.get(n)
      if (!d) continue
      days.append(
        el(
          'li',
          {},
          el('a', { href: d.url }, el('b', {}, String(n).padStart(2, '0')), ` ${d.title}`),
          el('span', {}, ` — ${d.line}`),
        ),
      )
    }
    list.append(el('li', {}, el('h2', {}, `${c.numeral} · ${c.title}`), days))
  }
  main.append(list)
}
