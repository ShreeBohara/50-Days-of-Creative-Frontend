import { describe, it, expect } from 'vitest'
import {
  ALPHABET,
  encode,
  decode,
  dayNumber,
  dateFromDay,
  toHash,
  fromHash,
  MAX_ORDER,
} from './shelfCode.js'

// mulberry32 — seeded, so the random round-trips are repeatable.
function mulberry32(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const int = (rnd, max) => Math.floor(rnd() * (max + 1))

function randomRecord(rnd) {
  const len = int(rnd, MAX_ORDER)
  return {
    variant: int(rnd, 11),
    order: Array.from({ length: len }, () => int(rnd, 31)),
    gold: int(rnd, 127),
    day: int(rnd, 4095),
  }
}

const strip = (code) => code.replace(/-/g, '')

const SAMPLE = { variant: 5, order: [0, 3, 7, 12, 1, 31, 2], gold: 88, day: 270 }

// Replace the last (check) character with each of the 32 symbols
// and decode them all — lets a test build a structurally bad code
// without knowing the checksum maths.
const allChecks = (body) => [...ALPHABET].map((c) => decode(body + c))

describe('encode', () => {
  it('uses the Crockford alphabet, dashed every 4 characters', () => {
    const code = encode(SAMPLE)
    expect(code).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-)*[0-9A-HJKMNP-TV-Z]{1,4}$/)
    expect(ALPHABET).toHaveLength(32)
    expect(ALPHABET).not.toMatch(/[ILOU]/)
  })

  it('is 7 + order length symbols long', () => {
    expect(strip(encode({ variant: 0, order: [], gold: 0, day: 0 }))).toHaveLength(7)
    expect(strip(encode(SAMPLE))).toHaveLength(14)
    const max = { variant: 11, order: Array(24).fill(31), gold: 127, day: 4095 }
    expect(strip(encode(max))).toHaveLength(31)
    expect(decode(encode(max))).toEqual(max)
  })

  it('is deterministic', () => {
    expect(encode(SAMPLE)).toBe(encode({ ...SAMPLE, order: [...SAMPLE.order] }))
  })

  it('throws RangeError on out-of-range fields', () => {
    const bad = (o) => () => encode({ ...SAMPLE, ...o })
    expect(bad({ variant: 12 })).toThrow(RangeError)
    expect(bad({ variant: -1 })).toThrow(RangeError)
    expect(bad({ variant: 1.5 })).toThrow(RangeError)
    expect(bad({ order: Array(25).fill(0) })).toThrow(RangeError)
    expect(bad({ order: [32] })).toThrow(RangeError)
    expect(bad({ order: [-1] })).toThrow(RangeError)
    expect(bad({ order: [NaN] })).toThrow(RangeError)
    expect(bad({ gold: 128 })).toThrow(RangeError)
    expect(bad({ day: 4096 })).toThrow(RangeError)
    expect(bad({ day: undefined })).toThrow(RangeError)
  })

  it('rejects a sparse order instead of packing the hole as shard 0', () => {
    // eslint-disable-next-line no-sparse-arrays
    expect(() => encode({ ...SAMPLE, order: [1, , 3] })).toThrow(RangeError)
  })

  it('throws TypeError on a missing record or order', () => {
    expect(() => encode(null)).toThrow(TypeError)
    expect(() => encode({ ...SAMPLE, order: '0,1' })).toThrow(TypeError)
  })
})

describe('decode', () => {
  it('round-trips hand-picked records, including the extremes', () => {
    const records = [
      SAMPLE,
      { variant: 0, order: [], gold: 0, day: 0 },
      { variant: 11, order: [31], gold: 127, day: 4095 },
      { variant: 6, order: [0, 0, 0], gold: 1, day: 1 },
    ]
    for (const r of records) expect(decode(encode(r))).toEqual(r)
  })

  it('round-trips 500 seeded random records', () => {
    const rnd = mulberry32(0xc0ffee)
    for (let i = 0; i < 500; i += 1) {
      const r = randomRecord(rnd)
      const code = encode(r)
      expect(decode(code)).toEqual(r)
      expect(encode(decode(code))).toBe(code)
    }
  })

  it('forgives case, dashes, spaces and Crockford look-alikes', () => {
    const zeroish = { variant: 0, order: Array(16).fill(1), gold: 0, day: 0 }
    const code = encode(zeroish)
    expect(code).toMatch(/0/)
    expect(code).toMatch(/1/)
    const sloppy = ` ${strip(code).toLowerCase().replace(/0/g, 'o').replace(/1/g, 'l')} `
    expect(decode(sloppy)).toEqual(zeroish)
    expect(decode(code.replace(/1/g, 'I').replace(/0/g, 'O'))).toEqual(zeroish)
    expect(decode(strip(code).split('').join(' '))).toEqual(zeroish)
    // Autocorrected dashes (en, em, minus) and a no-break space.
    expect(decode(code.replace(/-/g, '–'))).toEqual(zeroish)
    expect(decode(code.replace(/-/g, '—'))).toEqual(zeroish)
    expect(decode(code.replace(/-/g, '−'))).toEqual(zeroish)
    expect(decode(code.replace(/-/g, ' '))).toEqual(zeroish)
  })

  it('rejects every single-character typo', () => {
    const rnd = mulberry32(11)
    for (let k = 0; k < 20; k += 1) {
      const chars = strip(encode(randomRecord(rnd)))
      for (let i = 0; i < chars.length; i += 1) {
        for (const c of ALPHABET) {
          if (c === chars[i]) continue
          const typo = chars.slice(0, i) + c + chars.slice(i + 1)
          expect(decode(typo)).toBeNull()
        }
      }
    }
  })

  it('rejects every swap of two neighbouring characters', () => {
    const rnd = mulberry32(12)
    let swaps = 0
    for (let k = 0; k < 40; k += 1) {
      const chars = strip(encode(randomRecord(rnd)))
      for (let i = 0; i < chars.length - 1; i += 1) {
        if (chars[i] === chars[i + 1]) continue
        const swapped = chars.slice(0, i) + chars[i + 1] + chars[i] + chars.slice(i + 2)
        expect(decode(swapped)).toBeNull()
        swaps += 1
      }
    }
    expect(swaps).toBeGreaterThan(200)
  })

  it('rejects truncated codes and trailing garbage', () => {
    const chars = strip(encode(SAMPLE))
    for (let i = 0; i < chars.length; i += 1) {
      expect(decode(chars.slice(0, i) + chars.slice(i + 1))).toBeNull()
    }
    for (const c of ALPHABET) expect(decode(chars + c)).toBeNull()
    expect(decode(chars + chars)).toBeNull()
  })

  it('rejects foreign characters and non-strings', () => {
    const chars = strip(encode(SAMPLE))
    expect(decode(chars.slice(0, 3) + 'U' + chars.slice(4))).toBeNull()
    expect(decode(chars.slice(0, 3) + '*' + chars.slice(4))).toBeNull()
    expect(decode('')).toBeNull()
    expect(decode('----')).toBeNull()
    expect(decode(null)).toBeNull()
    expect(decode(12345678)).toBeNull()
  })

  it('accepts exactly one check character for a valid body', () => {
    const body = strip(encode(SAMPLE)).slice(0, -1)
    expect(allChecks(body).filter(Boolean)).toHaveLength(1)
  })

  it('rejects out-of-range fields even with a matching check symbol', () => {
    // Variant 11, empty order: first symbol is 1011|0 = 22 ('P').
    const body = strip(encode({ variant: 11, order: [], gold: 50, day: 9 })).slice(0, -1)
    expect(body[0]).toBe('P')
    // 1100|0 = 24 ('R') would be variant 12.
    expect(allChecks('R' + body.slice(1)).every((r) => r === null)).toBe(true)

    // Order length 25 (11001): symbol 0 = 0000|1, symbol 1 = 1001|x,
    // total 7 + 25 symbols.
    const long = '1' + ALPHABET[0b10010] + '0'.repeat(29)
    expect(long).toHaveLength(31)
    expect(allChecks(long).every((r) => r === null)).toBe(true)
  })

  it('rejects non-zero padding bits even with a matching check symbol', () => {
    // An empty order packs 28 bits into 6 symbols: the low 2 bits of
    // symbol 5 are padding.
    const body = strip(encode({ variant: 3, order: [], gold: 64, day: 100 })).slice(0, -1)
    const last = ALPHABET.indexOf(body[5])
    expect(last & 0b11).toBe(0)
    const dirty = body.slice(0, 5) + ALPHABET[last | 1]
    expect(allChecks(dirty).every((r) => r === null)).toBe(true)
  })
})

describe('dayNumber / dateFromDay', () => {
  it('counts whole UTC days since 2026-01-01', () => {
    expect(dayNumber(new Date('2026-01-01T00:00:00Z'))).toBe(0)
    expect(dayNumber(new Date('2026-01-01T23:59:59Z'))).toBe(0)
    expect(dayNumber(new Date('2026-01-02T00:00:00Z'))).toBe(1)
    expect(dayNumber(new Date('2026-09-28T19:42:00Z'))).toBe(270)
    expect(dayNumber(Date.UTC(2027, 0, 1))).toBe(365)
  })

  it('clamps to the 12-bit field and survives invalid dates', () => {
    expect(dayNumber(new Date('2025-12-31T23:59:59Z'))).toBe(0)
    expect(dayNumber(new Date('2099-01-01T00:00:00Z'))).toBe(4095)
    expect(dayNumber(new Date('nope'))).toBe(0)
    expect(dayNumber(undefined)).toBe(0)
  })

  it('round-trips through dateFromDay', () => {
    expect(dateFromDay(0).toISOString()).toBe('2026-01-01T00:00:00.000Z')
    expect(dateFromDay(270).toISOString()).toBe('2026-09-28T00:00:00.000Z')
    for (let n = 0; n <= 4095; n += 13) expect(dayNumber(dateFromDay(n))).toBe(n)
    expect(dayNumber(dateFromDay(4095))).toBe(4095)
  })
})

describe('hash helpers', () => {
  const code = encode(SAMPLE)

  it('writes and reads #bowl=CODE', () => {
    expect(toHash(code)).toBe(`#bowl=${code}`)
    expect(fromHash(toHash(code))).toBe(code)
    expect(fromHash(`bowl=${code}`)).toBe(code)
  })

  it('canonicalises sloppy codes and finds bowl among other params', () => {
    expect(fromHash(`#bowl=${strip(code).toLowerCase()}`)).toBe(code)
    expect(fromHash(`#view=shelf&bowl=${code}&x=1`)).toBe(code)
    expect(fromHash(`#bowl=${encodeURIComponent(code.replace(/-/g, ' '))}`)).toBe(code)
  })

  it('returns null for anything else', () => {
    expect(fromHash('')).toBeNull()
    expect(fromHash('#')).toBeNull()
    expect(fromHash('#bowl=')).toBeNull()
    expect(fromHash('#bowls=' + code)).toBeNull()
    expect(fromHash('#bowl=' + strip(code).slice(1))).toBeNull()
    expect(fromHash('#bowl=%E0%A4%A')).toBeNull()
    expect(fromHash(undefined)).toBeNull()
  })
})
