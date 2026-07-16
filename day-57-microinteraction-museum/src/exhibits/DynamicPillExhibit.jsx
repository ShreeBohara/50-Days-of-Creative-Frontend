import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { PILL_STATE, getNextPillState, isCompactPillState } from '../lib/pillState.js'
import './DynamicPillExhibit.css'

function PlayerIcon({ name }) {
  if (name === 'close') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
  }

  if (name === 'pause') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7v10M15 7v10" /></svg>
  }

  const isPrevious = name === 'previous'
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={isPrevious ? 'M7 6v12M18 7l-8 5 8 5Z' : 'M17 6v12M6 7l8 5-8 5Z'} />
    </svg>
  )
}

function Waveform({ reducedMotion }) {
  const heights = [8, 16, 11, 20, 13]

  return (
    <span className="dynamic-pill__waveform" aria-hidden="true">
      {heights.map((height, index) => (
        <motion.span
          key={height}
          animate={reducedMotion ? { height: 8 } : { height: [5, height, 7, Math.max(9, height - 3), 5] }}
          transition={reducedMotion ? { duration: 0.15 } : {
            duration: 0.82,
            delay: index * 0.07,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </span>
  )
}

function CompactPill({ state, onAdvance, reducedMotion }) {
  const playing = state === PILL_STATE.playing

  return (
    <motion.button
      className="dynamic-pill__compact"
      type="button"
      onClick={onAdvance}
      aria-label={playing ? 'Expand now playing' : 'Open now playing'}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      whileTap={reducedMotion ? undefined : { scale: 0.97 }}
    >
      {playing ? <Waveform reducedMotion={reducedMotion} /> : <span className="dynamic-pill__status-dot" aria-hidden="true" />}
      <span className="dynamic-pill__compact-copy">
        <strong>{playing ? 'Now playing' : 'Listening room'}</strong>
        <small>{playing ? 'Soft Focus' : 'Player ready'}</small>
      </span>
      <span className="dynamic-pill__arrow" aria-hidden="true">
        <svg viewBox="0 0 16 16"><path d="M4 12 12 4M6 4h6v6" /></svg>
      </span>
    </motion.button>
  )
}

function ExpandedPlayer({ onClose, reducedMotion }) {
  return (
    <motion.div
      className="dynamic-pill__expanded"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0.12 : 0.22 }}
    >
      <div className="dynamic-pill__track-row">
        <motion.div
          className="dynamic-pill__art"
          aria-hidden="true"
          animate={reducedMotion ? undefined : { rotate: [0, 3, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span />
        </motion.div>
        <div className="dynamic-pill__track-copy">
          <span>Now playing · 02:17</span>
          <strong>Soft Focus</strong>
          <p>Nia Vale</p>
        </div>
        <button className="dynamic-pill__close" type="button" onClick={onClose} aria-label="Close player">
          <PlayerIcon name="close" />
        </button>
      </div>

      <div className="dynamic-pill__timeline" aria-label="Track progress: 2 minutes 17 seconds of 3 minutes 41 seconds">
        <motion.span
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 0.62 }}
          transition={{ duration: reducedMotion ? 0.1 : 0.55, ease: 'easeOut' }}
        />
      </div>

      <div className="dynamic-pill__controls" aria-label="Playback controls">
        <button type="button" aria-label="Previous track"><PlayerIcon name="previous" /></button>
        <button className="dynamic-pill__pause" type="button" aria-label="Pause Soft Focus"><PlayerIcon name="pause" /></button>
        <button type="button" aria-label="Next track"><PlayerIcon name="next" /></button>
      </div>
    </motion.div>
  )
}

export function DynamicPillExhibit() {
  const [state, setState] = useState(PILL_STATE.idle)
  const reducedMotion = useReducedMotion()
  const compact = isCompactPillState(state)
  const advance = () => setState((current) => getNextPillState(current))

  return (
    <div className="dynamic-pill-stage">
      <motion.div
        className={`dynamic-pill dynamic-pill--${state}`}
        data-state={state}
        layout
        transition={{
          layout: reducedMotion
            ? { duration: 0.12 }
            : { type: 'spring', stiffness: 360, damping: 31, mass: 0.78 },
        }}
      >
        {compact ? (
          <CompactPill key={state} state={state} onAdvance={advance} reducedMotion={reducedMotion} />
        ) : (
          <ExpandedPlayer key="expanded" onClose={advance} reducedMotion={reducedMotion} />
        )}
      </motion.div>
      <p className="dynamic-pill-stage__caption" aria-live="polite">
        {state === PILL_STATE.idle ? 'Status' : state === PILL_STATE.playing ? 'Compact player' : 'Expanded player'}
      </p>
    </div>
  )
}
