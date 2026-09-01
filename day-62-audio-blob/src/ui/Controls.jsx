import { useRef, useState } from 'react'
import {
  useInputState,
  enterSynthMode,
  enterMicMode,
  enterFileMode,
} from '../audio/inputs.js'
import { engine, setSensitivity, setRelease, screamTest } from '../audio/engine.js'
import { THEMES, setTheme, useTheme } from '../themes.js'
import './controls.css'

const MODES = [
  { id: 'synth', label: 'SYNTH' },
  { id: 'mic', label: 'MIC' },
  { id: 'file', label: 'FILE' },
]

export default function Controls() {
  const input = useInputState()
  const theme = useTheme()
  const fileRef = useRef(null)
  const [sens, setSens] = useState(engine.sensitivity)
  const [rel, setRel] = useState(engine.release)
  const [screaming, setScreaming] = useState(false)

  const pickMode = (id) => {
    if (id === 'synth') enterSynthMode()
    if (id === 'mic') enterMicMode()
    if (id === 'file') fileRef.current?.click()
  }

  const onFilePicked = (e) => {
    const file = e.target.files?.[0]
    if (file) enterFileMode(file)
    e.target.value = '' // allow re-picking the same file
  }

  const onSens = (e) => {
    const v = Number(e.target.value)
    setSens(v)
    setSensitivity(v)
  }

  const onRel = (e) => {
    const v = Number(e.target.value)
    setRel(v)
    setRelease(v)
  }

  const scream = () => {
    screamTest()
    setScreaming(true)
    setTimeout(() => setScreaming(false), 2000)
  }

  const micHint =
    input.mic === 'requesting'
      ? 'allow the microphone…'
      : input.mic === 'denied'
        ? 'mic blocked — check the site permissions, or stay on synth'
        : input.mic === 'unavailable'
          ? 'no microphone available in this browser'
          : input.mode === 'mic'
            ? 'listening · speakers muted so it can’t feed back'
            : null

  return (
    <div className="controls" role="group" aria-label="audio controls">
      <div className="controls-row">
        <div className="mode-tabs" role="tablist" aria-label="input source">
          {MODES.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={input.mode === m.id}
              className={`mode-tab${input.mode === m.id ? ' is-active' : ''}${
                m.id === 'mic' && input.mic === 'requesting' ? ' is-waiting' : ''
              }`}
              disabled={m.id === 'mic' && input.mic === 'unavailable'}
              onClick={() => pickMode(m.id)}
            >
              {m.label}
            </button>
          ))}
          <input
            ref={fileRef}
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac"
            className="file-input"
            onChange={onFilePicked}
            aria-label="choose an audio file"
          />
        </div>

        <label className="slider">
          <span className="slider-name">sense</span>
          <input
            type="range"
            min="0.4"
            max="2.4"
            step="0.05"
            value={sens}
            onChange={onSens}
            aria-label="sensitivity"
          />
        </label>

        <label className="slider">
          <span className="slider-name">decay</span>
          <input
            type="range"
            min="0.06"
            max="0.6"
            step="0.02"
            value={rel}
            onChange={onRel}
            aria-label="smoothing decay"
          />
        </label>

        <div className="theme-picker" role="group" aria-label="color theme">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`theme-dot${theme.id === t.id ? ' is-active' : ''}`}
              style={{ background: `linear-gradient(120deg, ${t.low}, ${t.high})` }}
              title={t.name}
              aria-label={`theme ${t.name}`}
              aria-pressed={theme.id === t.id}
              onClick={() => setTheme(t)}
            />
          ))}
        </div>

        <button
          className={`scream${screaming ? ' is-screaming' : ''}`}
          onClick={scream}
        >
          {screaming ? 'AAAAAAAA' : 'SCREAM TEST'}
        </button>
      </div>

      {(micHint || input.fileName || input.fileError) && (
        <p className="controls-hint">
          {input.fileError ? (
            <span className="hint-error">{input.fileError}</span>
          ) : input.mode === 'file' && input.fileName ? (
            <>
              looping <span className="hint-file">{input.fileName}</span> — drop
              another anytime
            </>
          ) : (
            micHint
          )}
        </p>
      )}
    </div>
  )
}
