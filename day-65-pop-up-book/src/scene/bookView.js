// The book in three.js: boards, leaves and every spread's pop-up cards, posed
// each frame from the book model and the reader's mechanisms. Imperative on
// purpose — a page turn touches a few dozen matrices and nothing in React.

import * as THREE from 'three'
import { CLOSED, H, LEAF, W } from '../paper/dims.js'
import { poseSpread } from '../paper/spread.js'
import { layoutAtlas, atlasUV } from '../art/atlas.js'
import { COVER } from '../spreads/cover.js'
import { spreadAlpha, spreadAngles } from '../book/model.js'
import { applyFrame, applyLeaf, leafGeometry, panelGeometry } from './geometry.js'
import { paperGrain } from './paperGrain.js'
import { createDrawing } from './drawing.js'
import { cardBox } from '../art/printSpread.js'

export const BOARD = 0.25

/** A paper material: printed map, fibre normal map, almost no sheen. */
function paperMaterial(map, grain, repeat = 5) {
  const n = grain.clone()
  n.repeat.set(repeat, repeat * (H / W))
  n.needsUpdate = true
  return new THREE.MeshStandardMaterial({
    map,
    normalMap: n,
    normalScale: new THREE.Vector2(0.22, 0.22),
    roughness: 0.86,
    metalness: 0,
  })
}

/**
 * createBookView({ spreads, press, gl, tier }) → view
 *   spreads   compiled spreads (index = spread number)
 *   press     the print shop (createPress)
 *   gl        the renderer, for uploading prints one per frame
 *   tier      'A' desktop, 'C' phones
 */
export function createBookView({ spreads, press, gl = null, tier = 'A' }) {
  const S = spreads.length
  const root = new THREE.Group()
  root.name = 'book'
  const grain = paperGrain()
  const blank = new THREE.DataTexture(new Uint8Array([244, 238, 225, 255]), 1, 1)
  blank.colorSpace = THREE.SRGBColorSpace
  blank.needsUpdate = true
  const edgeMat = new THREE.MeshStandardMaterial({ color: '#f1ece0', roughness: 0.95, side: THREE.DoubleSide })
  const boardEdge = new THREE.MeshStandardMaterial({ color: '#2b3d63', roughness: 0.9, side: THREE.DoubleSide })

  // --- page textures per spread: { L, R } materials whose maps get swapped
  const pages = spreads.map(() => ({ L: paperMaterial(blank, grain), R: paperMaterial(blank, grain) }))
  const coverMats = { front: paperMaterial(blank, grain, 3), back: paperMaterial(blank, grain, 3) }

  // --- leaves: 0 is the front board, 1…S−1 are card leaves; then the back board
  const leafGeo = leafGeometry()
  const coverGeo = leafGeometry(
    W + COVER.overhang,
    H + COVER.overhang * 2,
    BOARD,
    0.4,
    (x, z) => [x / (W + COVER.overhang), (z + H / 2 + COVER.overhang) / (H + COVER.overhang * 2)],
    (x, z) => [1 - x / W, (z + H / 2) / H],
  )
  const leaves = []
  for (let i = 0; i < S; i++) {
    const mats = i === 0 ? [coverMats.front, pages[0].L, boardEdge] : [pages[i - 1].R, pages[i].L, edgeMat]
    const m = new THREE.Mesh(i === 0 ? coverGeo : leafGeo, mats)
    m.matrixAutoUpdate = false
    m.castShadow = m.receiveShadow = true
    m.userData = { leaf: i }
    leaves.push(m)
    root.add(m)
  }
  const backGeo = leafGeometry(
    W + COVER.overhang,
    H + COVER.overhang * 2,
    BOARD,
    0.4,
    (x, z) => [x / W, (z + H / 2) / H],
    (x, z) => [1 - x / (W + COVER.overhang), (z + H / 2 + COVER.overhang) / (H + COVER.overhang * 2)],
  )
  const backBoard = new THREE.Mesh(backGeo, [pages[S - 1].R, coverMats.back, boardEdge])
  backBoard.matrixAutoUpdate = false
  backBoard.receiveShadow = backBoard.castShadow = true
  applyLeaf(backBoard, 0, BOARD)
  root.add(backBoard)

  // --- the cloth spine: a half-round strip joining the outer hinge edges of
  // the two boards, rebuilt each frame from the front board's angle (round
  // and proud when shut, flattened away under the gutter when open)
  const SEG = 14
  const spineLen = H + COVER.overhang * 2
  const spinePos = new Float32Array((SEG + 1) * 2 * 3)
  const spineNrm = new Float32Array((SEG + 1) * 2 * 3)
  const spineIdx = []
  for (let i = 0; i < SEG; i++) {
    const a = i * 2
    spineIdx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
  }
  const spineGeo = new THREE.BufferGeometry()
  spineGeo.setAttribute('position', new THREE.BufferAttribute(spinePos, 3))
  spineGeo.setAttribute('normal', new THREE.BufferAttribute(spineNrm, 3))
  spineGeo.setIndex(spineIdx)
  const spine = new THREE.Mesh(spineGeo, boardEdge)
  spine.castShadow = spine.receiveShadow = true
  spine.frustumCulled = false
  root.add(spine)
  function updateSpine(phi0) {
    // outer hinge edges: back board at (0, −BOARD); front board's outside
    // face at the hinge, BOARD out along its front normal
    const ax = 0
    const ay = -BOARD
    const bx = -BOARD * Math.sin(phi0)
    const by = BOARD * Math.cos(phi0)
    const mx = (ax + bx) / 2
    const my = (ay + by) / 2
    const r = Math.hypot(bx - ax, by - ay) / 2
    // bulge away from the pages (toward −x when shut)
    const ux = (bx - ax) / (2 * r || 1)
    const uy = (by - ay) / (2 * r || 1)
    let px = uy
    let py = -ux
    if (px > 0) {
      px = -px
      py = -py
    }
    for (let i = 0; i <= SEG; i++) {
      const t = (i / SEG) * Math.PI
      // from a (t = 0) round the bulge to b (t = π)
      const cx = mx - Math.cos(t) * ux * r + Math.sin(t) * px * r
      const cy = my - Math.cos(t) * uy * r + Math.sin(t) * py * r
      const nx = -Math.cos(t) * ux + Math.sin(t) * px
      const ny = -Math.cos(t) * uy + Math.sin(t) * py
      for (let e = 0; e < 2; e++) {
        const k = (i * 2 + e) * 3
        spinePos[k] = cx
        spinePos[k + 1] = cy
        spinePos[k + 2] = (e ? 1 : -1) * (spineLen / 2)
        spineNrm[k] = nx
        spineNrm[k + 1] = ny
        spineNrm[k + 2] = 0
      }
    }
    spineGeo.attributes.position.needsUpdate = true
    spineGeo.attributes.normal.needsUpdate = true
    spine.visible = r > 0.02
  }

  // --- spreads: one group of panel meshes each, sharing an atlas material
  // (a card marked `draw` gets its own front: the reader's drawing canvas)
  let drawing = null
  const sheets = spreads.map((spread, k) => {
    const layout = layoutAtlas(spread)
    const mat = paperMaterial(blank, grain, Math.max(2, layout.size / 5))
    const group = new THREE.Group()
    group.name = `spread-${spread.id}`
    group.visible = false
    const meshes = []
    for (const p of spread.pieces) {
      const front = layout.rects.get(`${p.id}:front`)
      const back = layout.rects.get(`${p.id}:back`)
      let frontMat = mat
      let frontUV = (x, y) => atlasUV(front, layout.size, x, y, false)
      if (p.draw && !drawing) {
        const box = cardBox(p)
        drawing = createDrawing(box)
        drawing.spread = k
        drawing.piece = p.id
        frontMat = paperMaterial(drawing.texture, grain, 3)
        // fresh white card: a touch of its own glow so it reads as blank paper
        // waiting for a pencil even where the lamp only grazes it
        frontMat.emissive = new THREE.Color('#ffffff')
        frontMat.emissiveMap = drawing.texture
        frontMat.emissiveIntensity = 0.14
        frontUV = (x, y) => [(x - box.x0) / box.w, (y - box.y0) / box.h]
      }
      for (const pn of p.panels) {
        const geo = panelGeometry(pn.poly, pn.holes, (x, y, isBack) => (isBack ? atlasUV(back, layout.size, x, y, true) : frontUV(x, y)))
        const mesh = new THREE.Mesh(geo, [frontMat, mat, edgeMat])
        mesh.matrixAutoUpdate = false
        mesh.castShadow = mesh.receiveShadow = true
        mesh.userData = { spread: k, piece: p.id, panel: pn.key, key: `${p.id}.${pn.key}`, lift: 0 }
        meshes.push(mesh)
        group.add(mesh)
      }
    }
    root.add(group)
    return { spread, layout, mat, group, meshes, pose: null }
  })

  // --- printing: thumbnails of everything first, full prints near the reader
  const LEVEL = { thumb: 1, full: 2 }
  // phones frame the spread closer (portrait), so they need real resolution
  // too; residency keeps at most four spreads' full prints on the GPU
  const pageRes = tier === 'C' ? 34 : 46
  const atlasPx = 2048

  // Every spread keeps its thumbnail prints for the life of the page (a few
  // KB each), so a far spread can drop its full prints at once and fall back
  // to them. Full prints are kept only near the reader.
  //
  // Each surface set (a spread's pages, or its card sheet) is an `entry`:
  //   mats     the materials it textures (pages: [L, R]; sheet: [mat])
  //   tex      { 1: textures, 2: textures } landed prints by level
  //   jobs     { 1: job, 2: job } prints in flight
  //   want     the level this spread should show now (1 far, 2 near)
  const entries = spreads.map((spread, k) => ({
    pages: { kind: 'pages', k, mats: [pages[k].L, pages[k].R], tex: {}, jobs: {}, want: 1 },
    sheet: spread.pieces.length ? { kind: 'atlas', k, mats: [sheets[k].mat], tex: {}, jobs: {}, want: 1 } : null,
  }))
  const shown = (e) => (e.tex[2] && e.want >= 2 ? 2 : e.tex[1] ? 1 : e.tex[2] ? 2 : 0)

  // new prints are uploaded one per frame, and never while paper is moving
  // (a 2048² upload with mipmaps is a visible hitch mid-turn)
  const uploads = []
  let onLanded = null
  function show(e) {
    const level = shown(e)
    const texs = e.tex[level]
    if (!texs) return
    e.mats.forEach((m, i) => uploads.push({ mat: m, tex: texs[i] }))
  }
  function drainUploads(busy) {
    if (!uploads.length || busy) return false
    const { mat, tex } = uploads.shift()
    if (tex.image) {
      gl?.initTexture(tex)
      // the GPU has its copy: the source bitmap would only double the memory
      // (three uploads again only if the texture's version changes, never here)
      tex.image.close?.()
    }
    mat.map = tex
    onLanded?.()
    return uploads.length > 0
  }
  function drop(e, level) {
    const texs = e.tex[level]
    if (!texs) return
    delete e.tex[level]
    // never upload a texture that is about to be freed
    for (let i = uploads.length - 1; i >= 0; i--) if (texs.includes(uploads[i].tex)) uploads.splice(i, 1)
    for (const t of texs) {
      // still bound to a material until its replacement uploads: let the
      // upload queue swap first, then free
      queueMicrotask(() => {
        if (e.mats.some((m) => m.map === t)) {
          // fall back immediately to whatever is left (thumbnail or blank)
          const fallback = e.tex[1]?.[e.mats.findIndex((m) => m.map === t)] ?? blank
          for (const m of e.mats) if (m.map === t) m.map = fallback
        }
        t.image?.close?.()
        t.dispose()
      })
    }
  }

  function request(e, level, priority) {
    if (!e || e.tex[level]) return
    const pending = e.jobs[level]
    if (pending) {
      pending.reprioritise(priority)
      return
    }
    const spec =
      e.kind === 'pages'
        ? { kind: 'pages', spread: e.k, res: level === LEVEL.full ? pageRes : 6 }
        : { kind: 'atlas', spread: e.k, px: level === LEVEL.full ? atlasPx : 256 }
    const job = press.print(spec, e.kind === 'pages' ? priority : priority + 0.5)
    e.jobs[level] = job
    const free = (texs) => {
      for (const t of texs) {
        t.image?.close?.()
        t.dispose()
      }
    }
    job.then(
      (texs) => {
        // a job cancelled while already in a worker still lands: it must not
        // clear a newer job's handle, nor stack a second copy on the GPU
        if (e.jobs[level] === job) delete e.jobs[level]
        if (e.tex[level]) {
          free(texs)
          return
        }
        if (level > e.want) {
          // landed after the reader moved away: not worth the memory
          free(texs)
          return
        }
        e.tex[level] = texs
        show(e)
      },
      () => {
        // a failed print simply isn't there; a later visit asks again
        if (e.jobs[level] === job) delete e.jobs[level]
      },
    )
  }

  function want(k, level, priority) {
    if (k < 0 || k >= S) return
    for (const e of [entries[k].pages, entries[k].sheet]) {
      if (!e) continue
      e.want = Math.max(e.want, level)
      request(e, LEVEL.thumb, priority)
      if (level === LEVEL.full) request(e, LEVEL.full, priority)
    }
  }

  /** Far from the reader: back to the thumbnail now, full prints freed. */
  function evict(k) {
    for (const e of [entries[k].pages, entries[k].sheet]) {
      if (!e || e.want < LEVEL.full) continue
      e.want = LEVEL.thumb
      e.jobs[LEVEL.full]?.cancel()
      delete e.jobs[LEVEL.full]
      if (e.tex[LEVEL.full]) {
        show(e)
        drop(e, LEVEL.full)
      }
    }
  }

  let coverJob = null
  function boot() {
    coverJob = press.print({ kind: 'cover', res: tier === 'C' ? 22 : 36 }, 0).then(
      ([front, back]) => {
        uploads.push({ mat: coverMats.front, tex: front }, { mat: coverMats.back, tex: back })
      },
      () => {},
    )
    // the opening spread right behind the cover, the first chapter next, then
    // thumbnails of the whole book so a riffle never shows blank paper
    want(0, LEVEL.full, 1)
    want(1, LEVEL.full, 2)
    for (let k = 2; k < S; k++) want(k, LEVEL.thumb, 6 + k * 0.01)
  }

  /** Keep full prints for the open spread and its neighbours. */
  function residency(open, heading) {
    const near = new Set([open - 1, open, open + 1, open + 2 * Math.sign(heading || 1)])
    near.forEach((k) => want(k, LEVEL.full, k === open ? 1 : 2 + Math.abs(k - open)))
    for (let k = 0; k < S; k++) if (!near.has(k)) evict(k)
  }

  /**
   * Pose everything. mech(k) returns spread k's mechanism values.
   * Returns the poses of visible spreads (for hit-testing and sound).
   */
  function update(book, mech, busy = false) {
    const more = drainUploads(busy)
    for (let i = 0; i < S; i++) applyLeaf(leaves[i], book.phi[i], i === 0 ? BOARD : LEAF, i === 0)
    updateSpine(book.phi[0])
    const visible = []
    for (let k = 0; k < S; k++) {
      const sh = sheets[k]
      const alpha = spreadAlpha(book, k)
      const show = alpha > CLOSED && sh.meshes.length > 0
      sh.group.visible = show
      sh.alpha = alpha
      if (!show) {
        sh.pose = null
        continue
      }
      const [l, r] = spreadAngles(book, k)
      const pose = poseSpread(sh.spread, l, r, mech(k))
      sh.pose = pose
      for (const m of sh.meshes) {
        const f = pose.frames.get(m.userData.key)
        if (f) applyFrame(m, f)
      }
      visible.push(k)
    }
    visible.uploading = more || uploads.length > 0
    return visible
  }

  return {
    root,
    leaves,
    backBoard,
    drawing,
    sheets,
    boot,
    residency,
    update,
    get coverReady() {
      return coverJob
    },
    /** fn is called whenever a print lands on screen (demand frameloop) */
    onLanded(fn) {
      onLanded = fn
    },
    get uploading() {
      return uploads.length > 0
    },
    entries,
  }
}
