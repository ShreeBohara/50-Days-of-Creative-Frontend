import KineticHeadline from './KineticHeadline.jsx'

/**
 * The poster composition: a type-specimen layout with a kicker, the editable
 * kinetic headline, and a baseline footline. The reactivity engine attaches to
 * the headline glyphs in later commits.
 */
export default function Stage({
  headline,
  onHeadlineChange,
  registerGlyph,
  stageRef,
  fontLabel,
}) {
  return (
    <div className="stage-frame">
      <div className="crop crop-tl" aria-hidden="true" />
      <div className="crop crop-tr" aria-hidden="true" />
      <div className="crop crop-bl" aria-hidden="true" />
      <div className="crop crop-br" aria-hidden="true" />

      <label className="edit-bar">
        <span className="edit-bar-tag">edit</span>
        <input
          className="edit-bar-input"
          value={headline}
          onChange={(e) => onHeadlineChange(e.target.value)}
          spellCheck="false"
          autoComplete="off"
          maxLength={64}
          aria-label="Headline text"
          placeholder="type a headline…"
        />
      </label>

      <article className="poster" ref={stageRef}>
        <p className="poster-kicker">Specimen № 41 — Variable</p>
        <KineticHeadline text={headline} registerGlyph={registerGlyph} />
        <p className="poster-footline">{fontLabel}</p>
      </article>
    </div>
  )
}
