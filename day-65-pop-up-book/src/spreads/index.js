// Every spread of the book, in order: the opening, nine chapters, the end.
import opening from './s00-opening.js'
import sky from './s01-sky.js'
import letters from './s02-letters.js'
import light from './s03-light.js'
import growing from './s04-growing.js'
import sound from './s05-sound.js'
import machines from './s06-machines.js'
import interfaces from './s07-interfaces.js'
import motion from './s08-motion.js'
import craft from './s09-craft.js'
import end from './s10-end.js'
import { BOOK } from './registry.js'

export const SPREADS = [opening, sky, letters, light, growing, sound, machines, interfaces, motion, craft, end]
BOOK.spreads = SPREADS
