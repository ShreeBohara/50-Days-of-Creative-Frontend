// A test bench of every mechanism the book supports, used by the tests and
// handy to preview: node scripts/preview-spread.mjs src/paper/fixtures/lab.js
import { circle, rect } from '../polygon.js'

const solid = (ink) => (g) => g.fill(ink, [[-40, -40], [40, -40], [40, 40], [-40, 40]], 1)

export default {
  id: 'lab',
  paper: 'cream',
  pages: {
    L: (g) => g.text('black', 'lab · left', 1.5, 2, { size: 0.6 }),
    R: (g) => g.text('black', 'lab · right', 1.5, 2, { size: 0.6 }),
  },
  pieces: [
    // a platform over the gutter, with a card standing on its top crease
    { id: 'stage', kind: 'box', on: 'gutter', span: [15, 21], a: 4, b: 4, h: 3, front: solid('teal'), back: solid('yellow') },
    { id: 'actor', kind: 'vfold', on: 'stage', at: 16, glue: [50, 50], angle: [90, 90], outline: rect(-2.5, -4, 5, 4), front: solid('pink'), back: solid('blue') },
    // a tent further back
    { id: 'roof', kind: 'tent', on: 'gutter', span: [4, 9], a: 3, b: 3, la: 4.2, lb: 4.2, front: solid('orange') },
    // a flap on the right page that hides a little pop-up
    { id: 'door', kind: 'flap', on: 'page:R', at: [11, 6], size: [6, 5], front: solid('federal'), back: solid('mint') },
    { id: 'imp', kind: 'vfold', on: 'door', at: 3, glue: [55, 55], angle: [90, 90], outline: rect(-1.4, -2.2, 2.8, 2.2), front: solid('red') },
    // a wheel and a pull-tab driving a flat card on the left page
    { id: 'dial', kind: 'wheel', on: 'page:L', at: [6, 18], radius: 3.5, front: (g) => { g.fill('purple', circle(0, 0, 3.5)); g.fill('yellow', rect(-0.3, -3.4, 0.6, 2)) } },
    { id: 'pull', kind: 'slider', on: 'page:L', at: [1, 23], travel: [-4, 0], size: [8, 1.2], front: solid('green') },
    { id: 'rider', kind: 'flat', on: 'page:L', at: [9, 21], size: [2, 1.4], drive: { by: 'pull', move: [-4, -1], turn: -30 }, front: solid('red') },
  ],
  spots: [],
}
