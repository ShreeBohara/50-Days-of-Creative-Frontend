import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ParticleEngine,
  capDevicePixelRatio,
} from '../js/particle-engine.js'

function createCanvas(width = 320, height = 180) {
  const context = {
    transforms: [],
    clearRect() {},
    save() {},
    restore() {},
    setTransform(...values) {
      this.transforms.push(values)
    },
  }

  return {
    canvas: {
      width: 0,
      height: 0,
      style: {},
      getBoundingClientRect: () => ({ width, height }),
      getContext: () => context,
    },
    context,
  }
}

test('caps DPR at two and keeps all public coordinates in CSS pixels', () => {
  const { canvas, context } = createCanvas()
  const engine = new ParticleEngine({
    canvas,
    particles: [{ id: 'cup-1', x: 12, y: 18 }],
    getDevicePixelRatio: () => 3.5,
    renderParticle: () => {},
  })

  assert.equal(capDevicePixelRatio(3.5), 2)
  assert.equal(engine.width, 320)
  assert.equal(engine.height, 180)
  assert.equal(engine.dpr, 2)
  assert.equal(canvas.width, 640)
  assert.equal(canvas.height, 360)
  assert.deepEqual(context.transforms.at(-1), [2, 0, 0, 2, 0, 0])
  assert.deepEqual(
    { x: engine.particles[0].x, y: engine.particles[0].y },
    { x: 12, y: 18 },
  )
})

test('preserves particle identity and interrupts from the rendered position', () => {
  const particle = { id: 'cup-1', x: 0, y: 0 }
  const engine = new ParticleEngine({
    particles: [particle],
    renderParticle: () => {},
  })
  const persistentParticle = engine.particles[0]

  engine.setTargets([{ x: 100, y: 50 }], {
    now: 0,
    duration: 1_000,
    stagger: 0,
    easing: (value) => value,
  })
  engine.advance(500, { render: false })
  assert.equal(engine.particles[0], persistentParticle)
  assert.equal(engine.particles[0].x, 50)
  assert.equal(engine.particles[0].y, 25)

  engine.setTargets([{ x: 200, y: 100 }], {
    now: 500,
    duration: 500,
    stagger: 0,
    easing: (value) => value,
  })
  engine.advance(750, { render: false })

  assert.equal(engine.particles[0], persistentParticle)
  assert.equal(engine.particles[0].x, 125)
  assert.equal(engine.particles[0].y, 62.5)
})

test('reduced motion snaps targets and leaves no scheduled animation', () => {
  let scheduled = 0
  const engine = new ParticleEngine({
    particles: [{ id: 0, x: 0, y: 0 }],
    reducedMotion: true,
    requestAnimationFrame: () => {
      scheduled += 1
      return scheduled
    },
    renderParticle: () => {},
  })

  engine.setTargets([{ x: 80, y: 40 }], { now: 0, duration: 800 })

  assert.equal(engine.particles[0].x, 80)
  assert.equal(engine.particles[0].y, 40)
  assert.equal(engine.particles[0].transition, null)
  assert.equal(engine.isAnimating(10), false)
  assert.equal(scheduled, 0)
})

test('pause and resume exclude hidden time from a transition', () => {
  const engine = new ParticleEngine({
    particles: [{ id: 0, x: 0, y: 0 }],
    renderParticle: () => {},
  })

  engine.setTargets([{ x: 100, y: 0 }], {
    now: 0,
    duration: 1_000,
    stagger: 0,
    easing: (value) => value,
  })
  engine.advance(300, { render: false })
  engine.pause('visibility', 300)
  engine.resume('visibility', 800)
  engine.advance(900, { render: false })

  assert.equal(engine.particles[0].x, 40)
})

test('overlay hooks receive CSS-pixel frame state and can be removed', () => {
  const { canvas } = createCanvas(240, 160)
  const engine = new ParticleEngine({
    canvas,
    particles: [],
    renderParticle: () => {},
  })
  const frames = []
  const remove = engine.addOverlay((_context, frame) => {
    frames.push({ width: frame.width, height: frame.height })
  })

  engine.render(100)
  remove()
  engine.render(200)

  assert.deepEqual(frames, [{ width: 240, height: 160 }])
})
