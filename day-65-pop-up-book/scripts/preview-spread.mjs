#!/usr/bin/env node
// Render a spread without a browser, for designing pop-ups:
//
//   node scripts/preview-spread.mjs <spread-id | index | path/to/spread.js> [--res 30] [--no-sheet]
//
// Writes into _previews/:
//   <id>-3d.png     the spread posed at six opening angles / viewpoints
//                   (orthographic, printed textures, simple lamp shading)
//   <id>-sheet.png  both printed pages, then every card's front and back as a
//                   flat net with its folds (valley dashed, mountain dash-dot)
//                   and glue lines (hatched)
// and prints the physical-validity check (strain, through-page, folds-flat,
// smoothness, collisions). Exit code 1 if the spread is not buildable.

import { mkdirSync, writeFileSync } from 'node:fs'
import { createCanvas, installNodeCanvas } from './canvas-node.mjs'

installNodeCanvas()

const { compileSpread, poseSpread } = await import('../src/paper/spread.js')
const { checkSpread } = await import('../src/paper/validate.js')
const { printSpread, PAGE_BOX } = await import('../src/art/printSpread.js')
const { H, W } = await import('../src/paper/dims.js')

const args = process.argv.slice(2)
const flag = (name, dflt) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : dflt
}
const which = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1]?.startsWith('--') !== true) ?? '0'
// a path previews a spread file directly (e.g. one not yet in the book)
// (only the registry route imports every spread; a path imports just one,
// so a half-written neighbour can't break it)
const byPath = /\.m?js$/.test(which)
const SPREADS = byPath ? [] : (await import('../src/spreads/index.js')).SPREADS
const def = byPath
  ? (await import(new URL(`../${which}`, import.meta.url))).default
  : (SPREADS.find((s) => s.id === which) ?? SPREADS[Number(which)])
if (!def) {
  console.error(`no spread "${which}". known: ${SPREADS.map((s, i) => `${i}:${s.id}`).join(' ')}`)
  process.exit(2)
}
const res = Number(flag('res', 30))
const spread = compileSpread(def)
const t0 = performance.now()
const printed = printSpread(spread, { res, pageRes: res })
const tPrint = performance.now() - t0

// ---------------------------------------------------------------- validity
const check = checkSpread(spread)
console.log(`spread ${spread.id}: ${spread.pieces.length} pieces, printed in ${tPrint.toFixed(0)} ms`)
if (check.ok) console.log('  ✓ buildable: no strain, nothing through the pages, folds flat, smooth, no collisions')
else for (const p of check.problems) console.log(`  ✗ ${p.kind.padEnd(8)} ${p.piece}: ${p.detail}`)

mkdirSync(new URL('../_previews/', import.meta.url), { recursive: true })
const out = (name) => new URL(`../_previews/${name}`, import.meta.url)

// ------------------------------------------------------------------ 3D views
const dotp = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const crossp = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const normp = (a) => {
  const l = Math.hypot(...a)
  return a.map((v) => v / l)
}
const LIGHT = normp([-0.45, 0.8, -0.4])

function surfaces(pose) {
  const list = []
  for (const side of ['L', 'R']) {
    list.push({ frame: pose.frames.get(`page:${side}`), poly: [[0, 0], [W, 0], [W, H], [0, H]], holes: [], art: { front: printed.pages[side], back: null, box: PAGE_BOX }, page: true })
  }
  for (const p of spread.pieces) {
    const art = printed.cards.get(p.id)
    for (const pn of p.panels) {
      const frame = pose.frames.get(`${p.id}.${pn.key}`)
      if (frame) list.push({ frame, poly: pn.poly, holes: pn.holes, art, id: `${p.id}.${pn.key}` })
    }
  }
  return list
}

function drawView(ctx, cx, cy, scale, alpha, az, el, label, mech = {}) {
  const pose = poseSpread(spread, Math.PI, Math.PI - alpha, mech)
  const dir = [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)]
  const f = dir.map((v) => -v)
  const r = normp(crossp(f, [0, 1, 0]))
  const u = crossp(r, f)
  const list = surfaces(pose)
  for (const s of list) {
    const { o, ex, ey } = s.frame
    // depth of the polygon's centroid along the view (bigger = nearer)
    let mx = 0
    let my = 0
    for (const [x, y] of s.poly) {
      mx += x
      my += y
    }
    mx /= s.poly.length
    my /= s.poly.length
    const c = [o[0] + mx * ex[0] - my * ey[0], o[1] + mx * ex[1] - my * ey[1], o[2] + mx * ex[2] - my * ey[2]]
    s.depth = dotp(c, dir) + (s.page ? -1000 : 0)
  }
  list.sort((a, b) => a.depth - b.depth)
  for (const s of list) {
    const { o, ex, ey, n } = s.frame
    const facing = dotp(n, dir) >= 0
    const vis = facing ? n : n.map((v) => -v)
    const shade = 0.6 + 0.4 * Math.max(0, dotp(vis, LIGHT))
    ctx.save()
    ctx.setTransform(
      scale * dotp(ex, r),
      -scale * dotp(ex, u),
      -scale * dotp(ey, r),
      scale * dotp(ey, u),
      cx + scale * dotp(o, r),
      cy - scale * dotp(o, u),
    )
    const path = new globalThis.Path2D()
    for (const loop of [s.poly, ...s.holes]) {
      loop.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)))
      path.closePath()
    }
    ctx.save()
    ctx.clip(path, 'evenodd')
    const img = facing ? s.art.front : s.art.back
    const b = s.art.box
    // backs are painted as seen with the card flipped over left-to-right
    if (img) {
      ctx.save()
      if (!facing) {
        ctx.translate(b.x0 * 2 + b.w, 0)
        ctx.scale(-1, 1)
      }
      ctx.drawImage(img, b.x0 - 1 / res, b.y0 - 1 / res, img.width / res, img.height / res)
      ctx.restore()
    } else {
      ctx.fillStyle = '#efe9dc'
      ctx.fill(path)
    }
    ctx.fillStyle = `rgba(30,22,14,${(1 - shade).toFixed(3)})`
    ctx.fill(path, 'evenodd')
    ctx.restore()
    ctx.lineWidth = 0.03
    ctx.strokeStyle = 'rgba(40,30,20,0.55)'
    ctx.stroke(path)
    ctx.restore()
  }
  ctx.fillStyle = '#e8e2d6'
  ctx.font = '15px "Fragment Mono"'
  ctx.fillText(label, cx - 300, cy + 180)
}

{
  const cw = 760
  const ch = 520
  const views = [
    [Math.PI, 0, 0.92, 'flat open · from the reader'],
    [Math.PI, -0.75, 0.6, 'flat open · from the left'],
    [Math.PI, 0.75, 0.6, 'flat open · from the right'],
    [(130 * Math.PI) / 180, 0, 0.75, 'opened 130°'],
    [(75 * Math.PI) / 180, 0, 0.7, 'opened 75°'],
    [(25 * Math.PI) / 180, 0, 0.7, 'opened 25° (closing)'],
  ]
  const c = createCanvas(cw * 3, ch * 2)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#26342e'
  ctx.fillRect(0, 0, c.width, c.height)
  views.forEach(([alpha, az, el, label], i) => {
    const cx = (i % 3) * cw + cw / 2
    const cy = Math.floor(i / 3) * ch + ch / 2 + 20
    drawView(ctx, cx, cy, 15, alpha, az, el, label)
  })
  writeFileSync(out(`${spread.id}-3d.png`), c.toBuffer('image/png'))
}

// ---------------------------------------------------- mechanisms, if any
const mechs = spread.pieces.filter((p) => ['flap', 'slider', 'wheel'].includes(p.kind))
if (mechs.length) {
  const cw = 760
  const ch = 520
  const c = createCanvas(cw * Math.min(3, mechs.length), ch * Math.ceil(mechs.length / 3))
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#26342e'
  ctx.fillRect(0, 0, c.width, c.height)
  mechs.forEach((p, i) => {
    const v = p.kind === 'flap' ? Math.PI * 0.62 : p.kind === 'slider' ? 1 : 120
    drawView(ctx, (i % 3) * cw + cw / 2, Math.floor(i / 3) * ch + ch / 2 + 20, 15, Math.PI, 0, 0.92, `${p.id} (${p.kind}) worked`, { [p.id]: v })
  })
  writeFileSync(out(`${spread.id}-mech.png`), c.toBuffer('image/png'))
}

// -------------------------------------------------------------------- sheet
if (!args.includes('--no-sheet')) {
  const S = res
  const margin = 40
  const cards = spread.pieces.map((p) => ({ p, art: printed.cards.get(p.id) }))
  // shelf-pack the nets (front | back) under the pages
  const rowW = (W * 2 + 4) * S
  let x = margin
  let y = margin + H * S + 60
  let rowH = 0
  const placed = []
  for (const { p, art } of cards) {
    const w = art.box.w * S * 2 + 30
    const h = art.box.h * S + 40
    if (x + w > rowW + margin && x > margin) {
      x = margin
      y += rowH + 20
      rowH = 0
    }
    placed.push({ p, art, x, y })
    x += w + 30
    rowH = Math.max(rowH, h)
  }
  const c = createCanvas(rowW + margin * 2, y + rowH + margin)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#3a3f3a'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.drawImage(printed.pages.L, margin, margin, W * S, H * S)
  ctx.drawImage(printed.pages.R, margin + W * S + 4 * S, margin, W * S, H * S)
  ctx.fillStyle = '#ddd'
  ctx.font = '16px "Fragment Mono"'
  ctx.fillText('page:L', margin, margin + H * S + 24)
  ctx.fillText('page:R', margin + W * S + 4 * S, margin + H * S + 24)
  for (const { p, art, x: px, y: py } of placed) {
    for (const [k, img] of [
      [0, art.front],
      [1, art.back],
    ]) {
      const ox = px + k * (art.box.w * S + 30)
      ctx.save()
      ctx.translate(ox - art.box.x0 * S, py - art.box.y0 * S)
      ctx.scale(S, S)
      const path = new globalThis.Path2D()
      for (const loop of p.panels.flatMap((pn) => [pn.poly, ...pn.holes])) {
        // the back of a card is its front seen mirrored left-right
        loop.forEach(([lx, ly], i) => {
          const X = k ? art.box.x0 * 2 + art.box.w - lx : lx
          if (i) path.lineTo(X, ly)
          else path.moveTo(X, ly)
        })
        path.closePath()
      }
      ctx.save()
      ctx.clip(path, 'evenodd')
      ctx.drawImage(img, art.box.x0 - 1 / res, art.box.y0 - 1 / res, img.width / res, img.height / res)
      ctx.restore()
      ctx.lineWidth = 0.04
      ctx.strokeStyle = '#111'
      ctx.stroke(path)
      if (!k) {
        for (const l of p.lines.folds) {
          ctx.setLineDash(l.type === 'mountain' ? [0.3, 0.12, 0.05, 0.12] : [0.2, 0.12])
          ctx.strokeStyle = l.type === 'mountain' ? '#c2185b' : '#1565c0'
          ctx.lineWidth = 0.05
          ctx.beginPath()
          ctx.moveTo(...l.p0)
          ctx.lineTo(...l.p1)
          ctx.stroke()
        }
        ctx.setLineDash([])
        for (const l of p.lines.glue) {
          ctx.strokeStyle = '#2e7d32'
          ctx.lineWidth = 0.08
          ctx.beginPath()
          ctx.moveTo(...l.p0)
          ctx.lineTo(...l.p1)
          ctx.stroke()
        }
      }
      ctx.restore()
    }
    ctx.fillStyle = '#ddd'
    ctx.font = '14px "Fragment Mono"'
    ctx.fillText(`${p.id} · ${p.kind} on ${p.on}  (front | back)`, px, py + art.box.h * S + 20)
  }
  writeFileSync(out(`${spread.id}-sheet.png`), c.toBuffer('image/png'))
}

console.log(`  → _previews/${spread.id}-3d.png${mechs.length ? `, ${spread.id}-mech.png` : ''}${args.includes('--no-sheet') ? '' : `, ${spread.id}-sheet.png`}`)
process.exit(check.ok ? 0 : 1)
