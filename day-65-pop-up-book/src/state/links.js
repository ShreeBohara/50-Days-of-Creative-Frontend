// Deep links and the bookmark ribbon. The address bar follows the reader
// (#sky, #letters, … #end), a link to #day-18 opens day 18's chapter with its
// bookplate showing, and the last spread read is remembered so a returning
// reader can pick up where they left off.

import { SPREADS } from '../spreads/index.js'
import { CHAPTERS, chapterSpread } from '../spreads/chapters.js'

const RIBBON = 'sixty-five.ribbon.v1'

/** '#sky' → { spread: 1 }, '#day-18' → { spread: 1, day: 18 }, else null. */
export function parseHash(hash) {
  let h
  try {
    h = decodeURIComponent(String(hash || '').replace(/^#/, '')).trim().toLowerCase()
  } catch {
    return null // a truncated or mangled link: just open the book shut
  }
  if (!h) return null
  const day = /^day-?(\d{1,2})$/.exec(h)
  if (day) {
    const n = Number(day[1])
    const i = CHAPTERS.findIndex((c) => c.days.includes(n))
    return i >= 0 ? { spread: chapterSpread(i), day: n } : null
  }
  const k = SPREADS.findIndex((s) => s.id === h)
  return k >= 0 ? { spread: k } : null
}

/** The hash for an open spread ('' while the book is shut). */
export const hashFor = (k) => (k >= 0 && SPREADS[k] ? `#${SPREADS[k].id}` : '')

export function loadRibbon() {
  try {
    const v = Number(localStorage.getItem(RIBBON))
    return Number.isInteger(v) && v > 0 && v < SPREADS.length ? v : null
  } catch {
    return null
  }
}

export function saveRibbon(k) {
  try {
    if (k > 0) localStorage.setItem(RIBBON, String(k))
  } catch {
    /* private mode: the ribbon just won't be remembered */
  }
}
