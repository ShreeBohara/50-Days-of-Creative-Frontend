// The book's running order: an opening spread, nine chapters that between
// them hold every one of the 64 days, and the blank page at the end.
// Each chapter prints in its own two or three riso inks.

export const CHAPTERS = [
  { id: 'sky', numeral: 'I', title: 'The Night Sky', days: [3, 18, 19, 28, 34, 40, 52], inks: ['federal', 'yellow', 'pink'] },
  { id: 'letters', numeral: 'II', title: 'Letterforms', days: [1, 6, 14, 41, 46, 47, 55], inks: ['black', 'red', 'sunflower'] },
  { id: 'light', numeral: 'III', title: 'Light & Liquid', days: [2, 7, 20, 45, 53, 54, 61], inks: ['blue', 'aqua', 'pink', 'yellow'] },
  { id: 'growing', numeral: 'IV', title: 'Growing Things', days: [5, 8, 13, 42, 43, 44], inks: ['green', 'sunflower', 'teal'] },
  { id: 'sound', numeral: 'V', title: 'Sound', days: [4, 24, 30, 50, 62], inks: ['orange', 'purple', 'black'] },
  { id: 'machines', numeral: 'VI', title: 'Machines & Games', days: [10, 12, 16, 17, 32, 38, 51, 60], inks: ['red', 'blue', 'yellow'] },
  { id: 'interfaces', numeral: 'VII', title: 'Interfaces', days: [9, 21, 25, 26, 29, 35, 36, 37, 56], inks: ['teal', 'pink', 'black'] },
  { id: 'motion', numeral: 'VIII', title: 'Motion', days: [15, 23, 27, 31, 33, 39, 57, 58], inks: ['purple', 'yellow', 'aqua'] },
  { id: 'craft', numeral: 'IX', title: 'Print & Craft', days: [11, 22, 48, 49, 59, 63, 64], inks: ['gold', 'black', 'red'] },
]

/** Spread index of a chapter: spread 0 opens the book, chapters follow. */
export const chapterSpread = (i) => i + 1

/** Printed page numbers of spread k (left, right). */
export const folios = (k) => [k * 2, k * 2 + 1]
