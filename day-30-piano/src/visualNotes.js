import { getNoteColor } from './pianoModel'

export function createVisualNote(note, source = 'live', startedAt = performance.now()) {
  return {
    id: `${note.note}-${source}-${startedAt}`,
    color: getNoteColor(note.noteIndex),
    endedAt: null,
    note: note.note,
    noteIndex: note.noteIndex,
    source,
    startedAt,
  }
}
