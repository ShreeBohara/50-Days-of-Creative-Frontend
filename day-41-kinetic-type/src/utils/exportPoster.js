import { toPng, toBlob } from 'html-to-image'

// Capture the poster at the scene's paper color, 2× for crisp output.
async function options() {
  await document.fonts?.ready
  const paper = getComputedStyle(document.documentElement)
    .getPropertyValue('--paper')
    .trim()
  return { pixelRatio: 2, backgroundColor: paper || '#ece7d9', cacheBust: true }
}

export async function downloadPoster(node, name) {
  if (!node) return
  const dataUrl = await toPng(node, await options())
  const a = document.createElement('a')
  a.download = `${name}.png`
  a.href = dataUrl
  a.click()
}

export async function copyPoster(node) {
  if (!node) return
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
    throw new Error('clipboard-unsupported')
  }
  const blob = await toBlob(node, await options())
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}
