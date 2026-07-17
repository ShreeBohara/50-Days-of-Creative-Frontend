import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ScrollyController,
  findActiveStepIndex,
  getScrollDirection,
  getStepScrollOptions,
  makeTriggerRootMargin,
  pickIntersectingStep,
} from '../js/scrolly.js'

class FakeClassList {
  values = new Set()

  toggle(name, force) {
    if (force) this.values.add(name)
    else this.values.delete(name)
  }

  contains(name) {
    return this.values.has(name)
  }
}

function createElement(top = 0) {
  const listeners = new Map()
  const attributes = new Map()

  return {
    top,
    classList: new FakeClassList(),
    scrollOptions: null,
    addEventListener(type, listener) {
      listeners.set(type, listener)
    },
    removeEventListener(type) {
      listeners.delete(type)
    },
    dispatch(type) {
      listeners.get(type)?.({ preventDefault() {} })
    },
    setAttribute(name, value) {
      attributes.set(name, value)
    },
    removeAttribute(name) {
      attributes.delete(name)
    },
    getAttribute(name) {
      return attributes.get(name) ?? null
    },
    getBoundingClientRect() {
      return { top: this.top, height: 120 }
    },
    scrollIntoView(options) {
      this.scrollOptions = options
    },
  }
}

class FakeIntersectionObserver {
  static instance = null

  constructor(callback, options) {
    this.callback = callback
    this.options = options
    this.observed = []
    this.disconnected = false
    FakeIntersectionObserver.instance = this
  }

  observe(element) {
    this.observed.push(element)
  }

  disconnect() {
    this.disconnected = true
  }
}

function createFixture({ reducedMotion = false } = {}) {
  const steps = Array.from({ length: 8 }, (_, index) => createElement(index * 400))
  const railItems = Array.from({ length: 8 }, () => createElement())
  const windowObject = {
    scrollY: 0,
    innerHeight: 1_000,
    matchMedia: () => ({
      matches: reducedMotion,
      addEventListener() {},
      removeEventListener() {},
    }),
  }

  return { steps, railItems, windowObject }
}

test('pure helpers handle trigger geometry and both scroll directions', () => {
  const rectangles = [
    { top: -600 },
    { top: -100 },
    { top: 300 },
    { top: 800 },
  ]

  assert.equal(findActiveStepIndex(rectangles, 500), 2)
  assert.equal(findActiveStepIndex(rectangles, 50), 1)
  assert.equal(getScrollDirection(100, 200), 'down')
  assert.equal(getScrollDirection(200, 100), 'up')
  assert.equal(pickIntersectingStep([2, 3], 1, 'down', 8), 3)
  assert.equal(pickIntersectingStep([2, 3], 5, 'up', 8), 2)
  assert.equal(pickIntersectingStep([2, 3], 2, 'down', 8), 3)
  assert.equal(pickIntersectingStep([2, 3], 3, 'up', 8), 2)
  assert.equal(makeTriggerRootMargin(0.5, 0.1), '-45.00% 0px -45.00% 0px')
})

test('observer activation updates rail semantics and supports reverse scrolling', () => {
  const { steps, railItems, windowObject } = createFixture()
  const changes = []
  const controller = new ScrollyController({
    steps,
    railItems,
    window: windowObject,
    IntersectionObserver: FakeIntersectionObserver,
    onStepChange: (index, details) => changes.push([index, details.direction]),
  })
  const observer = FakeIntersectionObserver.instance

  assert.equal(observer.observed.length, 8)
  assert.equal(observer.options.rootMargin, '-46.00% 0px -46.00% 0px')
  assert.equal(railItems[0].getAttribute('aria-current'), 'step')

  windowObject.scrollY = 900
  observer.callback([{ target: steps[3], isIntersecting: true }])
  assert.equal(controller.activeIndex, 3)
  assert.equal(railItems[3].getAttribute('aria-current'), 'step')
  assert.equal(railItems[0].getAttribute('aria-current'), null)
  assert.equal(steps[3].classList.contains('is-active'), true)

  windowObject.scrollY = 350
  observer.callback([{ target: steps[1], isIntersecting: true }])
  assert.equal(controller.activeIndex, 1)
  assert.deepEqual(changes.at(-1), [1, 'up'])

  controller.destroy()
  assert.equal(observer.disconnected, true)
})

test('rail clicks use smooth scrolling unless reduced motion is active', () => {
  const fixture = createFixture()
  const controller = new ScrollyController({
    ...fixture,
    window: fixture.windowObject,
    IntersectionObserver: FakeIntersectionObserver,
  })

  fixture.railItems[5].dispatch('click')
  assert.deepEqual(fixture.steps[5].scrollOptions, getStepScrollOptions(false))
  assert.equal(controller.activeIndex, 5)

  controller.setReducedMotion(true)
  fixture.railItems[2].dispatch('click')
  assert.deepEqual(fixture.steps[2].scrollOptions, getStepScrollOptions(true))
  assert.equal(controller.activeIndex, 2)

  controller.destroy()
  fixture.railItems[6].dispatch('click')
  assert.equal(controller.activeIndex, 2)
})
