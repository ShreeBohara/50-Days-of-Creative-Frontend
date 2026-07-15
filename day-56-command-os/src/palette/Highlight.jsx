// Renders `text` with the fuzzy-matched characters (from score().indices)
// wrapped in accent spans. Matched/unmatched runs are coalesced so we emit as
// few nodes as possible — and never any raw HTML string injection.
export default function Highlight({ text, indices }) {
  const idx = indices || []
  if (idx.length === 0) return text

  const matched = new Set(idx)
  const runs = []
  let current = null
  for (let i = 0; i < text.length; i++) {
    const on = matched.has(i)
    if (!current || current.on !== on) {
      current = { on, str: text[i] }
      runs.push(current)
    } else {
      current.str += text[i]
    }
  }

  return runs.map((run, i) =>
    run.on ? (
      <span key={i} className="hl">
        {run.str}
      </span>
    ) : (
      <span key={i}>{run.str}</span>
    ),
  )
}
