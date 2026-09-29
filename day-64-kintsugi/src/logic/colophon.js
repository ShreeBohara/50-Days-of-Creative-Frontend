// ============================================================
// Colophon — the one line printed under a kept bowl.
//
//   23 pieces · 611 mm of gold · 28 Sep 2026 · 19:42
//
// Month names are fixed English abbreviations rather than
// Intl output, so the line looks the same in every locale; the
// time is the viewer's local wall clock, 24-hour.
// ============================================================

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const SEP = ' · '

const pad2 = (n) => String(n).padStart(2, '0')

// "28 Sep 2026 · 19:42" in local time.
export function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const day = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
  return `${day}${SEP}${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

// A hairline bowl never came apart, so "1 piece" would read
// oddly; it gets "a hairline" instead. `hairline` defaults to
// "exactly one piece" (after rounding) — pass hairline: false to
// force "1 piece".
export function piecesPhrase(pieces, hairline) {
  const valid = Number.isFinite(pieces)
  const n = valid ? Math.max(1, Math.round(pieces)) : 1
  const isHairline = hairline ?? (valid && Math.round(pieces) === 1)
  if (isHairline && n === 1) return 'a hairline'
  return n === 1 ? '1 piece' : `${n} pieces`
}

export function formatColophon({ pieces, goldMm, date, hairline } = {}) {
  const mm = Number.isFinite(goldMm) ? Math.max(0, Math.round(goldMm)) : 0
  const parts = [piecesPhrase(pieces, hairline), `${mm} mm of gold`]
  const when = formatDate(date ?? new Date())
  if (when) parts.push(when)
  return parts.join(SEP)
}

// Total gilded seam length in millimetres: Σ length · coverage.
// Coverage is per seam (aligned by position), clamped to 0..1.
export function goldMillimetres(seams, goldCoverage) {
  let metres = 0
  seams.forEach((s, i) => {
    const c = goldCoverage?.[i]
    if (Number.isFinite(c)) metres += s.length * Math.min(1, Math.max(0, c))
  })
  return metres * 1000
}

export function shelfLabel(record, isFriend) {
  const friend = isFriend ?? Boolean(record?.friend)
  return friend ? 'a bowl from a friend' : 'your bowl'
}
