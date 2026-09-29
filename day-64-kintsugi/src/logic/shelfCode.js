// ============================================================
// Shelf code — a mended bowl, small enough to read aloud.
//
// A record is { variant, order, gold, day }:
//   variant  0..11   which pre-fracture (see VARIANT_IDS)
//   order    ids     the shard ids in the order they were fitted
//   gold     0..127  gilded coverage, percent-ish
//   day      0..4095 days since 2026-01-01 UTC
//
// Bit layout (MSB first), then cut into 5-bit Crockford symbols:
//   4 variant · 5 order length · 5 per id · 7 gold · 12 day
//   · zero padding to a 5-bit boundary · 1 check symbol
//
// The check symbol makes the whole code a one-parity-symbol
// Reed–Solomon word over GF(32): read as a polynomial, the
// code evaluates to 0 at x = α. That catches every single
// mistyped character and every swap of two neighbouring
// characters (including the check itself) — a plain sum would
// miss all the swaps.
// ============================================================

export const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
export const MAX_ORDER = 24
export const MAX_VARIANT = 11
const EPOCH_MS = Date.UTC(2026, 0, 1)
const DAY_MS = 86_400_000
const HEADER_BITS = 4 + 5 + 7 + 12

// Multiply by α (= x) in GF(32) with the primitive polynomial
// x⁵ + x² + 1 (0b100101): shift, and fold the overflow bit back.
function mulAlpha(v) {
  const s = v << 1
  return s & 32 ? (s ^ 0b100101) & 31 : s
}

// Horner evaluation of the symbols at α. The nonzero seed keeps
// an all-zero string from being a valid code.
const SEED = 0b10101
function horner(symbols) {
  let acc = SEED
  for (const s of symbols) acc = mulAlpha(acc) ^ s
  return acc
}

// The check c that makes horner([...data, c]) === 0: in GF(2⁵)
// addition is XOR, so α·acc ⊕ c = 0 ⟺ c = α·acc.
function checkSymbol(data) {
  return mulAlpha(horner(data))
}

function assertInt(value, max, label) {
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new RangeError(`shelfCode: ${label} must be an integer 0..${max}, got ${value}`)
  }
}

export function encode(record) {
  if (record == null || typeof record !== 'object') {
    throw new TypeError('shelfCode: encode expects a record object')
  }
  const { variant, order, gold, day } = record
  assertInt(variant, MAX_VARIANT, 'variant')
  if (!Array.isArray(order)) throw new TypeError('shelfCode: order must be an array')
  if (order.length > MAX_ORDER) {
    throw new RangeError(`shelfCode: order holds at most ${MAX_ORDER} ids, got ${order.length}`)
  }
  // Indexed loop, not forEach: a hole in a sparse array must fail
  // validation rather than be skipped and packed as shard 0.
  for (let i = 0; i < order.length; i += 1) assertInt(order[i], 31, `order[${i}]`)
  assertInt(gold, 127, 'gold')
  assertInt(day, 4095, 'day')

  const bits = []
  const put = (value, width) => {
    for (let b = width - 1; b >= 0; b -= 1) bits.push((value >> b) & 1)
  }
  put(variant, 4)
  put(order.length, 5)
  for (const id of order) put(id, 5)
  put(gold, 7)
  put(day, 12)
  while (bits.length % 5) bits.push(0)

  const symbols = []
  for (let i = 0; i < bits.length; i += 5) {
    symbols.push((bits[i] << 4) | (bits[i + 1] << 3) | (bits[i + 2] << 2) | (bits[i + 3] << 1) | bits[i + 4])
  }
  symbols.push(checkSymbol(symbols))

  const chars = symbols.map((s) => ALPHABET[s]).join('')
  return chars.match(/.{1,4}/g).join('-')
}

// Crockford's forgiving read: case-insensitive, I/L → 1, O → 0,
// dashes and whitespace ignored — including the typographic
// dashes (‐ ‒ – — ―, −) that chat apps and notes autocorrect to.
function normalise(str) {
  return str
    .toUpperCase()
    .replace(/[\s\-\u2010-\u2015\u2212]/g, '')
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0')
}

// Symbol count for a given order length: ceil((28 + 5L) / 5) + 1.
const symbolCount = (len) => Math.ceil((HEADER_BITS + 5 * len) / 5) + 1

export function decode(str) {
  if (typeof str !== 'string') return null
  const clean = normalise(str)
  if (clean.length < symbolCount(0)) return null

  const symbols = []
  for (const ch of clean) {
    const v = ALPHABET.indexOf(ch)
    if (v < 0) return null
    symbols.push(v)
  }
  if (horner(symbols) !== 0) return null

  let pos = 0
  const bitAt = (i) => (symbols[Math.floor(i / 5)] >> (4 - (i % 5))) & 1
  const take = (width) => {
    let v = 0
    for (let b = 0; b < width; b += 1) v = (v << 1) | bitAt(pos++)
    return v
  }

  const variant = take(4)
  const len = take(5)
  if (variant > MAX_VARIANT || len > MAX_ORDER) return null
  // Exact length: anything extra is trailing garbage, anything
  // missing is a truncated code.
  if (symbols.length !== symbolCount(len)) return null

  const order = []
  for (let i = 0; i < len; i += 1) order.push(take(5))
  const gold = take(7)
  const day = take(12)
  const dataBits = (symbols.length - 1) * 5
  while (pos < dataBits) if (take(1) !== 0) return null

  return { variant, order, gold, day }
}

// Days since 2026-01-01 UTC, clamped to the 12-bit field. Takes
// a Date or epoch milliseconds; an invalid date reads as day 0.
export function dayNumber(date) {
  const ms = date instanceof Date ? date.getTime() : date
  if (!Number.isFinite(ms)) return 0
  const n = Math.floor((ms - EPOCH_MS) / DAY_MS)
  return Math.min(4095, Math.max(0, n))
}

// Midnight UTC of day n.
export function dateFromDay(n) {
  return new Date(EPOCH_MS + n * DAY_MS)
}

export function toHash(code) {
  return `#bowl=${code}`
}

// Pull the code out of a location.hash ("#bowl=K7M2-…", other
// params allowed). Returns the canonical dashed form, or null
// when there's no bowl param or it doesn't decode.
export function fromHash(hash) {
  if (typeof hash !== 'string') return null
  for (const part of hash.replace(/^#/, '').split('&')) {
    const eq = part.indexOf('=')
    if (eq < 0 || part.slice(0, eq) !== 'bowl') continue
    let raw
    try {
      raw = decodeURIComponent(part.slice(eq + 1))
    } catch {
      return null
    }
    const record = decode(raw)
    return record ? encode(record) : null
  }
  return null
}
