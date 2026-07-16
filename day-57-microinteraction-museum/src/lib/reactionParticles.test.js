import { describe, expect, it } from 'vitest'
import { capReactionParticles, createReactionParticles } from './reactionParticles.js'

describe('seeded reaction particles', () => {
  it('creates a repeatable burst of 10–14 particles', () => {
    const first = createReactionParticles(57)
    const second = createReactionParticles(57)

    expect(first).toEqual(second)
    expect(first.length).toBeGreaterThanOrEqual(10)
    expect(first.length).toBeLessThanOrEqual(14)
    expect(createReactionParticles(58)).not.toEqual(first)
  })

  it('keeps the generated physics inside the intended envelope', () => {
    const particles = createReactionParticles(912, 14)

    particles.forEach((particle) => {
      expect(Math.abs(particle.x)).toBeGreaterThanOrEqual(28)
      expect(Math.abs(particle.x)).toBeLessThanOrEqual(120)
      expect(particle.lift).toBeGreaterThanOrEqual(-144)
      expect(particle.lift).toBeLessThanOrEqual(-54)
      expect(particle.gravity).toBeGreaterThanOrEqual(76)
      expect(particle.gravity).toBeLessThanOrEqual(164)
      expect(['heart', 'spark']).toContain(particle.kind)
    })
  })

  it('retains only the newest live particles at the safety cap', () => {
    const existing = Array.from({ length: 96 }, (_, id) => ({ id }))
    const incoming = Array.from({ length: 12 }, (_, id) => ({ id: id + 96 }))
    const capped = capReactionParticles(existing, incoming)

    expect(capped).toHaveLength(100)
    expect(capped[0].id).toBe(8)
    expect(capped.at(-1).id).toBe(107)
  })
})
