// CI gate for the generated 3D assets (runs before `vite build`): every
// fracture variant exists, piece counts are in range, every shard but the
// anchor has a neighbour, the adjacency graph is connected from the anchor
// (so "mend the rest" can always finish), seams are well-formed, and files
// stay within budget.
//
//   node scripts/check-assets.mjs

import { readFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DAY = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUB = join(DAY, 'public')
const RANGES = { drop: [6, 9], fling: [18, 24] }
const BUDGET_KB = {
  'models/bowl.glb': 1400,
  'models/tray_tools.glb': 1600,
  'hdri/pine_attic_1k.hdr': 1700,
  'textures/shoji_gobo.png': 800,
}

const errors = []
const fail = (msg) => errors.push(msg)

async function size(rel) {
  try {
    return (await stat(join(PUB, rel))).size / 1024
  } catch {
    return -1
  }
}

async function checkVariant(id, sev) {
  const glb = await size(`models/fracture/${id}.glb`)
  if (glb < 0) return fail(`${id}: missing glb`)
  if (glb > 400) fail(`${id}: glb ${glb.toFixed(0)} KB > 400 KB`)
  let json
  try {
    json = JSON.parse(await readFile(join(PUB, 'data', 'seams', `${id}.json`), 'utf8'))
  } catch (e) {
    return fail(`${id}: seams json unreadable (${e.message})`)
  }
  const [lo, hi] = RANGES[sev]
  const n = json.shards.length
  if (n < lo || n > hi) fail(`${id}: ${n} shards outside ${lo}-${hi}`)
  const anchor = json.shards.filter((s) => s.anchor)
  if (anchor.length !== 1 || anchor[0].id !== json.anchor) fail(`${id}: expected exactly one anchor (id ${json.anchor})`)
  const adj = new Map(json.shards.map((s) => [s.id, new Set(s.neighbors)]))
  for (const s of json.shards) {
    if (!s.anchor && s.neighbors.length === 0) fail(`${id}: shard ${s.id} has no neighbour`)
    for (const nb of s.neighbors) if (!adj.get(nb)?.has(s.id)) fail(`${id}: neighbour ${s.id}->${nb} not symmetric`)
  }
  // connected from the anchor
  const seen = new Set([json.anchor])
  const queue = [json.anchor]
  while (queue.length) {
    for (const nb of adj.get(queue.shift()) ?? []) {
      if (!seen.has(nb)) {
        seen.add(nb)
        queue.push(nb)
      }
    }
  }
  if (seen.size !== n) fail(`${id}: ${n - seen.size} shard(s) unreachable from the anchor`)
  for (const sm of json.seams) {
    const k = sm.points.length
    if (k < 2) fail(`${id}: seam ${sm.id} has ${k} point(s)`)
    if (sm.normals.length !== k || sm.arclen.length !== k || sm.impactDist.length !== k) fail(`${id}: seam ${sm.id} array lengths differ`)
    for (let i = 1; i < k; i++) {
      if (sm.arclen[i] < sm.arclen[i - 1]) {
        fail(`${id}: seam ${sm.id} arclen not monotone`)
        break
      }
    }
    if (!adj.get(sm.a)?.has(sm.b)) fail(`${id}: seam ${sm.id} joins non-neighbours ${sm.a}/${sm.b}`)
  }
  return { id, shards: n, seams: json.seams.length, kb: glb }
}

const rows = []
for (let z = 0; z < 6; z++) {
  for (const sev of ['drop', 'fling']) {
    const r = await checkVariant(`Z${z}_${sev}`, sev)
    if (r) rows.push(r)
  }
}
for (const [rel, kb] of Object.entries(BUDGET_KB)) {
  const s = await size(rel)
  if (s < 0) fail(`${rel}: missing`)
  else if (s > kb) fail(`${rel}: ${s.toFixed(0)} KB > ${kb} KB`)
}

for (const r of rows) console.log(`  ${r.id.padEnd(9)} ${String(r.shards).padStart(2)} shards  ${String(r.seams).padStart(3)} seams  ${r.kb.toFixed(0)} KB`)
if (errors.length) {
  console.error(`\n${errors.length} asset problem(s):\n  ` + errors.join('\n  '))
  process.exit(1)
}
console.log('  assets ok')
