// The shelf: your last six kept bowls (and bowls friends sent you), stored as
// share codes in localStorage. Storage can be missing or throw (private
// windows, blocked site data) — the shelf then simply starts empty.

import { dateFromDay, dayNumber, decode, encode, fromHash, toHash } from '../logic/shelfCode.js'
import { variantFromIndex, variantIndex } from '../logic/impactZone.js'

const KEY = 'd64.shelf.v1'
export const SHELF_MAX = 6

function valid(e) {
  return e && typeof e.code === 'string' && decode(e.code) !== null
}

export function loadShelf() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(list) ? list.filter(valid).slice(0, SHELF_MAX) : []
  } catch {
    return []
  }
}

function saveShelf(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, SHELF_MAX)))
  } catch {
    // no storage — the shelf lives for this visit only
  }
}

/** Newest first. A friend's link is shelved once; your own bowls can share a
 * code (same variant, fit order and day) and are still different bowls. */
export function addToShelf(entry) {
  const list = loadShelf().filter((e) => !(entry.friend && e.code === entry.code))
  list.unshift(entry)
  const out = list.slice(0, SHELF_MAX)
  saveShelf(out)
  return out
}

/** The kept bowl as a share code + the shelf entry that carries it. */
export function recordFor({ variant, order, date = new Date(), pieces, goldMm, hairline }) {
  const record = {
    variant: variantIndex(variant),
    order: hairline ? [] : order.slice(0, 24),
    gold: 100,
    day: dayNumber(date),
  }
  const code = encode(record)
  return { code, date: date.toISOString(), pieces, goldMm: Math.round(goldMm), hairline: !!hairline, friend: false }
}

/** Decode a shelf entry (or a friend's code) into what the scene needs. */
export function describe(entry) {
  const r = decode(entry.code)
  if (!r) return null
  return {
    ...entry,
    variantId: variantFromIndex(r.variant),
    order: r.order,
    hairline: entry.hairline ?? r.order.length === 0,
    date: entry.date ?? dateFromDay(r.day).toISOString(),
  }
}

export function shareUrl(code) {
  return `${location.origin}${location.pathname}${toHash(code)}`
}

/** A #bowl= link someone sent: put it on this shelf as a friend's bowl. */
export function takeFriendFromHash() {
  const code = fromHash(location.hash)
  if (!code) return null
  const r = decode(code)
  if (!r) return null
  const entry = {
    code,
    date: dateFromDay(r.day).toISOString(),
    pieces: r.order.length || 1,
    hairline: r.order.length === 0,
    friend: true,
  }
  const shelf = addToShelf(entry)
  try {
    history.replaceState(null, '', location.pathname + location.search)
  } catch {
    // leave the hash if history is locked down
  }
  return { entry, shelf }
}
