const SEMITONES = [
  { name: 'C', type: 'white' },
  { name: 'C#', type: 'black', after: 'C' },
  { name: 'D', type: 'white' },
  { name: 'D#', type: 'black', after: 'D' },
  { name: 'E', type: 'white' },
  { name: 'F', type: 'white' },
  { name: 'F#', type: 'black', after: 'F' },
  { name: 'G', type: 'white' },
  { name: 'G#', type: 'black', after: 'G' },
  { name: 'A', type: 'white' },
  { name: 'A#', type: 'black', after: 'A' },
  { name: 'B', type: 'white' },
]

const WHITE_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

export const FIRST_OCTAVE = 3
export const LAST_OCTAVE = 5

export const NOTES = Array.from({ length: LAST_OCTAVE - FIRST_OCTAVE + 1 }, (_, octaveOffset) => {
  const octave = FIRST_OCTAVE + octaveOffset
  const octaveWhiteStart = octaveOffset * WHITE_ORDER.length

  return SEMITONES.map((tone, semitoneIndex) => {
    const whiteOffset = WHITE_ORDER.indexOf(tone.type === 'black' ? tone.after : tone.name)
    const whiteIndex = octaveWhiteStart + whiteOffset

    return {
      id: `${tone.name}${octave}`,
      note: `${tone.name}${octave}`,
      label: tone.name,
      octave,
      semitoneIndex,
      noteIndex: octaveOffset * SEMITONES.length + semitoneIndex,
      type: tone.type,
      whiteIndex,
      blackSlot: tone.type === 'black' ? whiteIndex + 1 : null,
    }
  })
}).flat()

export const WHITE_NOTES = NOTES.filter((note) => note.type === 'white')
export const BLACK_NOTES = NOTES.filter((note) => note.type === 'black')
export const WHITE_KEY_COUNT = WHITE_NOTES.length

export const KEYBOARD_KEYS = [
  { key: 'a', offset: 0 },
  { key: 'w', offset: 1 },
  { key: 's', offset: 2 },
  { key: 'e', offset: 3 },
  { key: 'd', offset: 4 },
  { key: 'f', offset: 5 },
  { key: 't', offset: 6 },
  { key: 'g', offset: 7 },
  { key: 'y', offset: 8 },
  { key: 'h', offset: 9 },
  { key: 'u', offset: 10 },
  { key: 'j', offset: 11 },
  { key: 'k', offset: 12 },
  { key: 'o', offset: 13 },
  { key: 'l', offset: 14 },
  { key: 'p', offset: 15 },
]

export function getKeyboardAssignments(baseOctave) {
  const startNoteIndex = (baseOctave - FIRST_OCTAVE) * SEMITONES.length

  return KEYBOARD_KEYS.map((binding) => {
    const note = NOTES.find((candidate) => candidate.noteIndex === startNoteIndex + binding.offset)

    return note ? { ...binding, note } : null
  }).filter(Boolean)
}

export function getNoteColor(noteIndex) {
  const progress = noteIndex / Math.max(NOTES.length - 1, 1)
  const hue = 34 + progress * 176

  return `hsl(${Math.round(hue)} 92% 62%)`
}
