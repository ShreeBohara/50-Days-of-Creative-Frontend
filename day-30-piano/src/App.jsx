import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CircleDot, Gauge, KeyboardMusic, Radio, SlidersHorizontal } from 'lucide-react'
import './App.css'
import {
  BLACK_NOTES,
  FIRST_OCTAVE,
  NOTES,
  WHITE_KEY_COUNT,
  WHITE_NOTES,
  getKeyboardAssignments,
  getNoteColor,
} from './pianoModel'
import { PianoRollCanvas } from './PianoRollCanvas'
import { usePianoEngine } from './usePianoEngine'
import { createVisualNote } from './visualNotes'

function PianoKey({ isActive, keyboardLabel, note, type }) {
  const style =
    type === 'black'
      ? {
          '--key-color': getNoteColor(note.noteIndex),
          left: `${(note.blackSlot / WHITE_KEY_COUNT) * 100}%`,
        }
      : {
          '--key-color': getNoteColor(note.noteIndex),
        }

  return (
    <button
      type="button"
      className={`piano-key ${type === 'black' ? 'black-key' : 'white-key'} ${
        isActive ? 'is-active' : ''
      }`}
      style={style}
      data-note={note.note}
      data-octave={note.octave}
      aria-label={`Play ${note.note}`}
    >
      {keyboardLabel ? <span className="key-binding">{keyboardLabel}</span> : null}
      <span className="key-glow" aria-hidden="true" />
      <span className="note-name">{note.note}</span>
    </button>
  )
}

function PianoKeyboard({
  activeNotes,
  keyboardLabels,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) {
  return (
    <div
      className="piano-keyboard"
      aria-label="Three octave piano keyboard"
      onPointerCancel={onPointerCancel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="white-key-row">
        {WHITE_NOTES.map((note) => (
          <PianoKey
            key={note.id}
            isActive={activeNotes.has(note.note)}
            keyboardLabel={keyboardLabels.get(note.note)}
            note={note}
            type="white"
          />
        ))}
      </div>
      <div className="black-key-row">
        {BLACK_NOTES.map((note) => (
          <PianoKey
            key={note.id}
            isActive={activeNotes.has(note.note)}
            keyboardLabel={keyboardLabels.get(note.note)}
            note={note}
            type="black"
          />
        ))}
      </div>
      <div className="octave-rail" aria-hidden="true">
        <span>C3</span>
        <span>C4</span>
        <span>C5</span>
      </div>
    </div>
  )
}

function App() {
  const [instrument] = useState('piano')
  const [keyboardOctave] = useState(FIRST_OCTAVE)
  const [volume] = useState(-10)
  const [activeNotes, setActiveNotes] = useState(() => new Set())
  const [visualNotes, setVisualNotes] = useState([])
  const activeNotesRef = useRef(new Set())
  const activeVisualNotesRef = useRef(new Map())
  const heldKeyboardKeysRef = useRef(new Map())
  const pointerNotesRef = useRef(new Map())
  const noteByName = useMemo(() => new Map(NOTES.map((note) => [note.note, note])), [])
  const keyboardAssignments = useMemo(
    () => getKeyboardAssignments(keyboardOctave),
    [keyboardOctave],
  )
  const assignmentByKey = useMemo(
    () => new Map(keyboardAssignments.map((binding) => [binding.key, binding.note])),
    [keyboardAssignments],
  )
  const keyboardLabels = useMemo(
    () =>
      new Map(
        keyboardAssignments.map((binding) => [binding.note.note, binding.key.toUpperCase()]),
      ),
    [keyboardAssignments],
  )
  const { audioError, isAudioReady, triggerAttack, triggerAttackRelease, triggerRelease } =
    usePianoEngine({ instrument, volume })
  const activeNoteReadout = activeNotes.size ? Array.from(activeNotes).join(' ') : 'No notes held'

  const handleAudioCheck = () => {
    triggerAttackRelease('C4', '8n', 0.86)
  }

  const startNote = useCallback(
    (note, velocity = 0.82, source = 'live') => {
      if (activeNotesRef.current.has(note.note)) {
        return
      }

      const visualNote = createVisualNote(note, source)
      const nextNotes = new Set(activeNotesRef.current)
      nextNotes.add(note.note)
      activeVisualNotesRef.current.set(note.note, visualNote.id)
      activeNotesRef.current = nextNotes
      setActiveNotes(nextNotes)
      setVisualNotes((currentNotes) => [
        ...currentNotes.filter((entry) => performance.now() - entry.startedAt < 4200),
        visualNote,
      ])
      triggerAttack(note.note, velocity)
    },
    [triggerAttack],
  )

  const releaseNote = useCallback(
    (note) => {
      if (!activeNotesRef.current.has(note.note)) {
        return
      }

      const nextNotes = new Set(activeNotesRef.current)
      const visualId = activeVisualNotesRef.current.get(note.note)
      nextNotes.delete(note.note)
      activeVisualNotesRef.current.delete(note.note)
      activeNotesRef.current = nextNotes
      setActiveNotes(nextNotes)
      setVisualNotes((currentNotes) =>
        currentNotes.map((entry) =>
          entry.id === visualId && !entry.endedAt ? { ...entry, endedAt: performance.now() } : entry,
        ),
      )
      triggerRelease(note.note)
    },
    [triggerRelease],
  )

  const getNoteFromPoint = useCallback(
    (event) => {
      const target = document.elementFromPoint(event.clientX, event.clientY)
      const key = target?.closest?.('.piano-key')

      return key?.dataset.note ? noteByName.get(key.dataset.note) : null
    },
    [noteByName],
  )

  useEffect(() => {
    const ignoreTypingTargets = (target) =>
      target instanceof HTMLElement &&
      ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)

    const handleKeyDown = (event) => {
      if (event.repeat || ignoreTypingTargets(event.target)) {
        return
      }

      const keyboardKey = event.key.toLowerCase()
      const note = assignmentByKey.get(keyboardKey)

      if (!note || heldKeyboardKeysRef.current.has(keyboardKey)) {
        return
      }

      event.preventDefault()
      heldKeyboardKeysRef.current.set(keyboardKey, note.note)
      startNote(note, 0.9)
    }

    const handleKeyUp = (event) => {
      const keyboardKey = event.key.toLowerCase()
      const noteName = heldKeyboardKeysRef.current.get(keyboardKey)
      const note = noteName ? noteByName.get(noteName) : null

      if (!note) {
        return
      }

      heldKeyboardKeysRef.current.delete(keyboardKey)
      releaseNote(note)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [assignmentByKey, noteByName, releaseNote, startNote])

  const handlePointerDown = (event) => {
    const note = getNoteFromPoint(event)

    if (!note) {
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerNotesRef.current.set(event.pointerId, note.note)
    startNote(note, event.pointerType === 'touch' ? 0.72 : 0.86)
  }

  const handlePointerMove = (event) => {
    if (!pointerNotesRef.current.has(event.pointerId)) {
      return
    }

    const nextNote = getNoteFromPoint(event)
    const previousNoteName = pointerNotesRef.current.get(event.pointerId)

    if (!nextNote || nextNote.note === previousNoteName) {
      return
    }

    const previousNote = noteByName.get(previousNoteName)
    if (previousNote) {
      releaseNote(previousNote)
    }

    pointerNotesRef.current.set(event.pointerId, nextNote.note)
    startNote(nextNote, event.pointerType === 'touch' ? 0.72 : 0.84)
  }

  const handlePointerEnd = (event) => {
    const noteName = pointerNotesRef.current.get(event.pointerId)
    const note = noteName ? noteByName.get(noteName) : null

    if (note) {
      releaseNote(note)
    }

    pointerNotesRef.current.delete(event.pointerId)
  }

  return (
    <main className="piano-app">
      <header className="studio-header" aria-label="Project introduction">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            <KeyboardMusic size={24} />
          </span>
          <div>
            <p className="day-tag">Day 30</p>
            <h1>Interactive Piano Studio</h1>
          </div>
        </div>
        <p className="header-copy">
          A playable three-octave piano with live synthesis, recording, playback, and a falling-note
          visualizer tuned for fast keyboard practice.
        </p>
      </header>

      <section className="studio-grid" aria-label="Piano workspace">
        <div className="instrument-stage">
          <div className="stage-topline">
            <div>
              <p className="section-kicker">Visualizer</p>
              <h2>Piano roll monitor</h2>
            </div>
            <span className="engine-pill">
              <CircleDot size={14} aria-hidden="true" />
              {isAudioReady ? 'Audio engine ready' : 'Audio unlocks on first play'}
            </span>
          </div>

          <div className="transport-strip" aria-label="Audio engine controls">
            <button type="button" className="primary-action" onClick={handleAudioCheck}>
              Wake Audio
            </button>
            <span className={audioError ? 'engine-message is-error' : 'engine-message'}>
              {audioError || 'Tone.js PolySynth routed through reverb and studio volume.'}
            </span>
            <span className="live-note-readout" aria-live="polite">
              {activeNoteReadout}
            </span>
          </div>

          <div className="visualizer-frame" aria-label="Falling notes visualizer">
            <PianoRollCanvas notes={visualNotes} />
            <span className="scanline scanline-a" />
            <span className="scanline scanline-b" />
            <span className="scanline scanline-c" />
          </div>

          <PianoKeyboard
            activeNotes={activeNotes}
            keyboardLabels={keyboardLabels}
            onPointerCancel={handlePointerEnd}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
          />
        </div>

        <aside className="control-rack" aria-label="Piano controls">
          <section className="rack-panel">
            <div className="panel-heading">
              <Radio size={18} aria-hidden="true" />
              <h2>Sound Engine</h2>
            </div>
            <p>Polyphonic Tone.js synthesis, reverb, ADSR shaping, and instrument color.</p>
          </section>

          <section className="rack-panel">
            <div className="panel-heading">
              <Gauge size={18} aria-hidden="true" />
              <h2>Recorder</h2>
            </div>
            <p>Capture note timing, replay phrases, and clear takes without leaving the keyboard.</p>
          </section>

          <section className="rack-panel">
            <div className="panel-heading">
              <SlidersHorizontal size={18} aria-hidden="true" />
              <h2>Performance</h2>
            </div>
            <p>QWERTY mappings, octave shift, sustain, labels, touch-friendly sizing, and focus states.</p>
          </section>
        </aside>
      </section>
    </main>
  )
}

export default App
