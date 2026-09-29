// Pack Blender's raw exports (blender/_work/*.glb) into web-ready models in
// public/models: dedup/prune/weld, meshopt geometry compression (includes
// quantisation), and WebP textures — normal maps at a higher quality so the
// pinholes and throwing lines don't turn into block noise. Fails if a file
// blows its budget.
//
//   node scripts/pack.mjs

import { readdir, stat, mkdir } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, meshopt, prune, textureCompress, weld } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import sharp from 'sharp'

const DAY = join(dirname(fileURLToPath(import.meta.url)), '..')
const WORK = join(DAY, 'blender', '_work')
const OUT = join(DAY, 'public', 'models')

// raw file (relative to _work) → [output (relative to public/models), budget KB]
const JOBS = [
  ['bowl_raw.glb', 'bowl.glb', 1400],
  ['tray_tools_raw.glb', 'tray_tools.glb', 1600],
]

async function exists(p) {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

async function main() {
  await MeshoptEncoder.ready
  await MeshoptDecoder.ready
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })

  const jobs = [...JOBS]
  const fracDir = join(WORK, 'fracture')
  if (await exists(fracDir)) {
    for (const f of (await readdir(fracDir)).filter((n) => n.endsWith('.glb')).sort()) {
      jobs.push([join('fracture', f), join('fracture', f), 400])
    }
  }

  let failed = false
  let total = 0
  for (const [src, dst, budgetKB] of jobs) {
    const from = join(WORK, src)
    if (!(await exists(from))) {
      console.log(`  skip  ${src} (not built)`)
      continue
    }
    const doc = await io.read(from)
    await doc.transform(
      dedup(),
      prune({ keepLeaves: true, keepAttributes: true }), // shards ship untextured but need their UVs
      weld(),
      textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^normalTexture$/, quality: 94 }),
      textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(?!normalTexture$).*/, quality: 88 }),
      meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
    )
    const to = join(OUT, dst)
    await mkdir(dirname(to), { recursive: true })
    await io.write(to, doc)
    const kb = (await stat(to)).size / 1024
    total += kb
    const over = kb > budgetKB
    failed ||= over
    console.log(`${over ? '  OVER' : '  ok  '}  ${relative(DAY, to)}  ${kb.toFixed(0)} KB / ${budgetKB} KB`)
  }
  console.log(`  total ${(total / 1024).toFixed(2)} MB`)
  if (failed) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
