import { CircleDot, Gauge, KeyboardMusic, Radio, SlidersHorizontal } from 'lucide-react'
import './App.css'
import { BLACK_NOTES, WHITE_KEY_COUNT, WHITE_NOTES, getNoteColor } from './pianoModel'

function PianoKey({ note, type }) {
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
      className={`piano-key ${type === 'black' ? 'black-key' : 'white-key'}`}
      style={style}
      aria-label={`Play ${note.note}`}
    >
      <span className="note-name">{note.note}</span>
    </button>
  )
}

function PianoKeyboard() {
  return (
    <div className="piano-keyboard" aria-label="Three octave piano keyboard">
      <div className="white-key-row">
        {WHITE_NOTES.map((note) => (
          <PianoKey key={note.id} note={note} type="white" />
        ))}
      </div>
      <div className="black-key-row" aria-hidden="true">
        {BLACK_NOTES.map((note) => (
          <PianoKey key={note.id} note={note} type="black" />
        ))}
      </div>
    </div>
  )
}

function App() {
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
              Audio unlocks on first play
            </span>
          </div>

          <div className="visualizer-frame" aria-hidden="true">
            <span className="scanline scanline-a" />
            <span className="scanline scanline-b" />
            <span className="scanline scanline-c" />
          </div>

          <PianoKeyboard />
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
