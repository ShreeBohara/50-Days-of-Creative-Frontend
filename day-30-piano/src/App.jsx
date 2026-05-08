import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CircleDot,
  Gauge,
  KeyboardMusic,
  Play,
  Radio,
  Square,
  Trash2,
  SlidersHorizontal,
} from 'lucide-react'
import './App.css'
import {
  BLACK_NOTES,
  FIRST_OCTAVE,
  LAST_OCTAVE,
  NOTES,
  WHITE_KEY_COUNT,
  WHITE_NOTES,
  getKeyboardAssignments,
  getNoteColor,
} from './pianoModel'
import { PianoRollCanvas } from './PianoRollCanvas'
import { INSTRUMENT_PRESETS, usePianoEngine } from './usePianoEngine'
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

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')

  return `${minutes}:${seconds}`
}

function App() {
  const [instrument, setInstrument] = useState('piano')
  const [isSustainOn, setIsSustainOn] = useState(false)
  const [keyboardOctave, setKeyboardOctave] = useState(FIRST_OCTAVE)
  const [showKeyLabels, setShowKeyLabels] = useState(true)
  const [volume, setVolume] = useState(-10)
  const [activeNotes, setActiveNotes] = useState(() => new Set())
  const [isPlayingRecording, setIsPlayingRecording] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedNotes, setRecordedNotes] = useState([])
  const [recordingElapsed, setRecordingElapsed] = useState(0)
  const [visualNotes, setVisualNotes] = useState([])
  const activeNotesRef = useRef(new Set())
  const activeRecordingNotesRef = useRef(new Map())
  const activeVisualNotesRef = useRef(new Map())
  const heldKeyboardKeysRef = useRef(new Map())
  const pointerNotesRef = useRef(new Map())
  const playbackTimersRef = useRef([])
  const recordingStartedAtRef = useRef(0)
  const isRecordingRef = useRef(false)
  const sustainedNotesRef = useRef(new Set())
  const sustainOnRef = useRef(false)
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
  const visibleKeyboardLabels = useMemo(
    () => (showKeyLabels ? keyboardLabels : new Map()),
    [keyboardLabels, showKeyLabels],
  )
  const { audioError, isAudioReady, triggerAttack, triggerAttackRelease, triggerRelease } =
    usePianoEngine({ instrument, volume })
  const activeNoteReadout = activeNotes.size ? Array.from(activeNotes).join(' ') : 'No notes held'
  const recordedDuration = recordedNotes.reduce(
    (duration, note) => Math.max(duration, note.startedAtMs + (note.durationMs ?? 0)),
    0,
  )

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

      if (isRecordingRef.current && source === 'live') {
        const recordedNote = {
          id: `${note.note}-${performance.now()}`,
          durationMs: null,
          note: note.note,
          noteIndex: note.noteIndex,
          source,
          startedAtMs: performance.now() - recordingStartedAtRef.current,
          velocity,
        }

        activeRecordingNotesRef.current.set(note.note, recordedNote.id)
        setRecordedNotes((currentNotes) => [...currentNotes, recordedNote])
      }

      setVisualNotes((currentNotes) => [
        ...currentNotes.filter((entry) => performance.now() - entry.startedAt < 4200),
        visualNote,
      ])
      triggerAttack(note.note, velocity)
    },
    [triggerAttack],
  )

  const releaseNote = useCallback(
    (note, force = false) => {
      if (!activeNotesRef.current.has(note.note)) {
        return
      }

      const visualId = activeVisualNotesRef.current.get(note.note)

      if (isRecordingRef.current) {
        const recordedNoteId = activeRecordingNotesRef.current.get(note.note)
        const releasedAt = performance.now() - recordingStartedAtRef.current

        activeRecordingNotesRef.current.delete(note.note)
        setRecordedNotes((currentNotes) =>
          currentNotes.map((entry) =>
            entry.id === recordedNoteId && entry.durationMs === null
              ? { ...entry, durationMs: Math.max(80, releasedAt - entry.startedAtMs) }
              : entry,
          ),
        )
      }

      if (sustainOnRef.current && !force) {
        sustainedNotesRef.current.add(note.note)
        return
      }

      const nextNotes = new Set(activeNotesRef.current)
      nextNotes.delete(note.note)
      sustainedNotesRef.current.delete(note.note)
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

  useEffect(() => {
    if (!isRecording) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setRecordingElapsed(performance.now() - recordingStartedAtRef.current)
    }, 120)

    return () => window.clearInterval(timer)
  }, [isRecording])

  useEffect(() => {
    return () => {
      playbackTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  const handleRecord = () => {
    playbackTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    playbackTimersRef.current = []
    activeRecordingNotesRef.current.clear()
    recordingStartedAtRef.current = performance.now()
    isRecordingRef.current = true
    setIsPlayingRecording(false)
    setIsRecording(true)
    setRecordedNotes([])
    setRecordingElapsed(0)
  }

  const handleStopRecording = () => {
    const stoppedAt = performance.now() - recordingStartedAtRef.current

    isRecordingRef.current = false
    setIsRecording(false)
    setRecordingElapsed(stoppedAt)

    setRecordedNotes((currentNotes) =>
      currentNotes.map((entry) =>
        entry.durationMs === null
          ? { ...entry, durationMs: Math.max(80, stoppedAt - entry.startedAtMs) }
          : entry,
      ),
    )
    activeRecordingNotesRef.current.clear()
  }

  const handleClearRecording = () => {
    playbackTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    playbackTimersRef.current = []
    activeRecordingNotesRef.current.clear()
    isRecordingRef.current = false
    setIsPlayingRecording(false)
    setIsRecording(false)
    setRecordedNotes([])
    setRecordingElapsed(0)
  }

  const handlePlayRecording = () => {
    if (!recordedNotes.length || isRecording || isPlayingRecording) {
      return
    }

    playbackTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    playbackTimersRef.current = []
    setIsPlayingRecording(true)

    recordedNotes.forEach((entry) => {
      const note = noteByName.get(entry.note)
      const duration = Math.max(80, entry.durationMs ?? 180)

      if (!note) {
        return
      }

      const startTimer = window.setTimeout(() => {
        startNote(note, entry.velocity, 'playback')
      }, entry.startedAtMs)
      const stopTimer = window.setTimeout(() => {
        releaseNote(note, true)
      }, entry.startedAtMs + duration)

      playbackTimersRef.current.push(startTimer, stopTimer)
    })

    const playbackLength = recordedNotes.reduce(
      (length, entry) => Math.max(length, entry.startedAtMs + (entry.durationMs ?? 180)),
      0,
    )

    playbackTimersRef.current.push(
      window.setTimeout(() => {
        setIsPlayingRecording(false)
      }, playbackLength + 220),
    )
  }

  const handleSustainToggle = () => {
    const nextSustainValue = !isSustainOn

    sustainOnRef.current = nextSustainValue
    setIsSustainOn(nextSustainValue)

    if (!nextSustainValue) {
      Array.from(sustainedNotesRef.current).forEach((noteName) => {
        const note = noteByName.get(noteName)

        if (note) {
          releaseNote(note, true)
        }
      })
      sustainedNotesRef.current.clear()
    }
  }

  const shiftKeyboardOctave = (direction) => {
    setKeyboardOctave((currentOctave) =>
      Math.min(LAST_OCTAVE, Math.max(FIRST_OCTAVE, currentOctave + direction)),
    )
  }

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
            keyboardLabels={visibleKeyboardLabels}
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
            <label className="field-group">
              <span>Instrument</span>
              <select value={instrument} onChange={(event) => setInstrument(event.target.value)}>
                {Object.entries(INSTRUMENT_PRESETS).map(([value, preset]) => (
                  <option key={value} value={value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-group">
              <span>Volume {volume} dB</span>
              <input
                type="range"
                min="-32"
                max="0"
                step="1"
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
              />
            </label>
          </section>

          <section className="rack-panel">
            <div className="panel-heading">
              <Gauge size={18} aria-hidden="true" />
              <h2>Recorder</h2>
            </div>
            <div className={isRecording ? 'recording-status is-recording' : 'recording-status'}>
              <span aria-hidden="true" />
              {isRecording
                ? `Recording ${formatDuration(recordingElapsed)}`
                : `${recordedNotes.length} notes / ${formatDuration(recordedDuration)}`}
            </div>
            <div className="transport-controls" aria-label="Recording controls">
              <button type="button" onClick={handleRecord} disabled={isRecording}>
                <CircleDot size={16} aria-hidden="true" />
                Record
              </button>
              <button type="button" onClick={handleStopRecording} disabled={!isRecording}>
                <Square size={16} aria-hidden="true" />
                Stop
              </button>
              <button
                type="button"
                onClick={handlePlayRecording}
                disabled={!recordedNotes.length || isRecording || isPlayingRecording}
              >
                <Play size={16} aria-hidden="true" />
                {isPlayingRecording ? 'Playing' : 'Play'}
              </button>
              <button type="button" onClick={handleClearRecording} disabled={!recordedNotes.length}>
                <Trash2 size={16} aria-hidden="true" />
                Clear
              </button>
            </div>
          </section>

          <section className="rack-panel">
            <div className="panel-heading">
              <SlidersHorizontal size={18} aria-hidden="true" />
              <h2>Performance</h2>
            </div>
            <div className="octave-controls" aria-label="Keyboard octave shift">
              <button
                type="button"
                onClick={() => shiftKeyboardOctave(-1)}
                disabled={keyboardOctave === FIRST_OCTAVE}
              >
                Oct -
              </button>
              <span>C{keyboardOctave} map</span>
              <button
                type="button"
                onClick={() => shiftKeyboardOctave(1)}
                disabled={keyboardOctave === LAST_OCTAVE}
              >
                Oct +
              </button>
            </div>
            <button
              type="button"
              className={isSustainOn ? 'toggle-button is-on' : 'toggle-button'}
              onClick={handleSustainToggle}
              aria-pressed={isSustainOn}
            >
              Sustain {isSustainOn ? 'On' : 'Off'}
            </button>
            <button
              type="button"
              className={showKeyLabels ? 'toggle-button is-on' : 'toggle-button'}
              onClick={() => setShowKeyLabels((currentValue) => !currentValue)}
              aria-pressed={showKeyLabels}
            >
              Key Labels {showKeyLabels ? 'On' : 'Off'}
            </button>
          </section>
        </aside>
      </section>
    </main>
  )
}

export default App
