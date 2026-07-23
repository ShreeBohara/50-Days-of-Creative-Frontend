// Pure sequencing math for the bleepy background tune — no Web Audio
// imports here so node:test can load it.

export const BPM = 140;
export const STEPS_PER_BEAT = 4;

export function midiToFreq(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function stepDuration(bpm = BPM, stepsPerBeat = STEPS_PER_BEAT) {
  return 60 / bpm / stepsPerBeat;
}

// Two bars of A-minor pentatonic arpeggio in 16th steps (null = rest).
// A4 E5 A5 C6 E6 pattern with a cheeky octave bounce.
export const SONG = [
  { midi: 69, len: 1 },
  { midi: 76, len: 1 },
  { midi: 81, len: 1 },
  { midi: 84, len: 1 },
  { midi: 88, len: 1 },
  { midi: 84, len: 1 },
  { midi: 81, len: 1 },
  { midi: 76, len: 1 },
  { midi: 72, len: 1 },
  { midi: 79, len: 1 },
  { midi: 84, len: 1 },
  { midi: 87, len: 1 },
  { midi: 91, len: 1 },
  { midi: 87, len: 1 },
  { midi: 84, len: 1 },
  { midi: 79, len: 1 },
  { midi: 67, len: 1 },
  { midi: 74, len: 1 },
  { midi: 79, len: 1 },
  { midi: 83, len: 1 },
  { midi: 86, len: 1 },
  { midi: 83, len: 1 },
  { midi: 79, len: 1 },
  { midi: 74, len: 1 },
  { midi: 69, len: 1 },
  { midi: 76, len: 1 },
  { midi: 81, len: 1 },
  { midi: 84, len: 1 },
  { midi: 88, len: 2 },
  { midi: null, len: 1 },
  { midi: 81, len: 1 },
];

// One bass note per bar (16 steps each), an octave-and-change below.
export const BASS = [45, 48, 43, 45];

export function songSteps(song = SONG) {
  return song.reduce((total, note) => total + note.len, 0);
}

export function stepAt(index, song = SONG) {
  const total = songSteps(song);
  let cursor = ((index % total) + total) % total;
  for (const note of song) {
    if (cursor < note.len) return note;
    cursor -= note.len;
  }
  return song[0];
}

export function bassForStep(index, song = SONG, bass = BASS) {
  const total = songSteps(song);
  const wrapped = ((index % total) + total) % total;
  const bar = Math.floor(wrapped / 16) % bass.length;
  return bass[bar];
}
