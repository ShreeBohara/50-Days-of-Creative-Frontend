import { useMemo } from 'react'

/**
 * Splits a headline into per-word / per-glyph spans so each glyph can be
 * individually transformed by the reactivity engine (added in later commits).
 *
 * `registerGlyph(node, meta)` lets a parent collect glyph DOM nodes for the
 * rAF loop; it is a no-op until the engine is wired in.
 */
export default function KineticHeadline({ text, registerGlyph }) {
  const words = useMemo(() => {
    const safe = text.length ? text : ' '
    // Preserve word boundaries; collapse runs of whitespace to single gaps.
    return safe.split(/(\s+)/).filter((seg) => seg.length > 0)
  }, [text])

  let glyphIndex = 0

  return (
    <h1 className="headline" aria-label={text}>
      {words.map((seg, wi) => {
        if (/^\s+$/.test(seg)) {
          return (
            <span className="headline-space" key={`s${wi}`} aria-hidden="true">
              {' '}
            </span>
          )
        }
        return (
          <span className="headline-word" key={`w${wi}`} aria-hidden="true">
            {Array.from(seg).map((ch) => {
              const i = glyphIndex++
              return (
                <span
                  className="glyph"
                  key={i}
                  data-glyph={i}
                  ref={
                    registerGlyph
                      ? (node) => registerGlyph(node, { index: i, char: ch })
                      : undefined
                  }
                >
                  {ch}
                </span>
              )
            })}
          </span>
        )
      })}
    </h1>
  )
}
