// Fuzzy subsequence scorer, built from scratch (no fuzzy-search library).
//
// score(query, target) greedily matches every query character in order against
// target and rewards matches that are (a) consecutive with the previous match
// and (b) sit on a word boundary (string start, after a separator, or a
// camelCase hump). Gaps between matches are penalised so tighter, earlier
// matches rank higher. Returns { score, indices } or null when there is no
// subsequence match. Matching is case-insensitive; indices point into the
// ORIGINAL target so the UI can highlight the real characters.

const SCORE_MATCH = 16
const BONUS_CONSECUTIVE = 12
const BONUS_BOUNDARY = 10
const BONUS_START = 8
const PENALTY_GAP = 2
const PENALTY_GAP_MAX = 12

const SEPARATORS = new Set([' ', '-', '_', '/', '.', ':', ',', '(', ')', '·'])

function isUpper(ch) {
  return ch !== ch.toLowerCase() && ch === ch.toUpperCase()
}
function isLower(ch) {
  return ch !== ch.toUpperCase() && ch === ch.toLowerCase()
}

/** A boundary is the string start, a char after a separator, or a camelCase hump. */
export function isBoundary(target, i) {
  if (i === 0) return true
  const prev = target[i - 1]
  if (SEPARATORS.has(prev)) return true
  if (isLower(prev) && isUpper(target[i])) return true
  return false
}

export function score(query, target) {
  const q = query.trim().toLowerCase()
  if (!q) return { score: 0, indices: [] }

  const tl = target.toLowerCase()
  const indices = []
  let cursor = 0
  let prevMatch = -2
  let total = 0

  for (const ch of q) {
    let found = -1
    for (let k = cursor; k < tl.length; k++) {
      if (tl[k] === ch) {
        found = k
        break
      }
    }
    if (found === -1) return null

    let s = SCORE_MATCH
    if (found === prevMatch + 1) s += BONUS_CONSECUTIVE
    if (isBoundary(target, found)) s += BONUS_BOUNDARY
    if (found === 0) s += BONUS_START

    const gap = found - (prevMatch + 1)
    if (gap > 0) s -= Math.min(gap * PENALTY_GAP, PENALTY_GAP_MAX)

    total += s
    indices.push(found)
    prevMatch = found
    cursor = found + 1
  }

  return { score: total, indices }
}

/**
 * Rank items by fuzzy score against a query, keeping only matches.
 * `getText` extracts the searchable string from each item.
 * With an empty query every item passes through (score 0), order preserved.
 */
export function rankItems(items, query, getText) {
  if (!query.trim()) {
    return items.map((item) => ({ item, score: 0, indices: [] }))
  }
  const scored = []
  for (const item of items) {
    const result = score(query, getText(item))
    if (result) scored.push({ item, score: result.score, indices: result.indices })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored
}
