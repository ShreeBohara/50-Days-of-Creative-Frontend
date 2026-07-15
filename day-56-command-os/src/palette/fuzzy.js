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

const KEYWORD_PENALTY = 40

/**
 * Match a command against a query. Score the visible label first so highlight
 * indices always line up with it; if the label misses, fall back to the hidden
 * keywords (ranked lower, no highlight). Returns { score, indices } or null.
 */
export function matchCommand(item, query) {
  const byLabel = score(query, item.label)
  if (byLabel) return { score: byLabel.score, indices: byLabel.indices }
  if (item.keywords) {
    const byKeyword = score(query, item.keywords)
    if (byKeyword) return { score: byKeyword.score - KEYWORD_PENALTY, indices: [] }
  }
  return null
}

/**
 * Rank a list of commands ({ label, keywords }) by fuzzy score, keeping only
 * matches, best first. An empty query passes everything through (score 0) in
 * its original order.
 */
export function rankCommands(items, query) {
  if (!query.trim()) {
    return items.map((item) => ({ item, score: 0, indices: [] }))
  }
  const scored = []
  for (const item of items) {
    const result = matchCommand(item, query)
    if (result) scored.push({ item, score: result.score, indices: result.indices })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored
}
