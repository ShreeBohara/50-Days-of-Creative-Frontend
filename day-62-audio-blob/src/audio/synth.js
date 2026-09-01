// ============================================================
// Built-in generative track — oscillators only, no samples.
//
// Three voices scheduled with the classic lookahead pattern:
//   BASS  saw + sub sine through a lowpass  → swells the blob
//   ARP   square 8ths + feedback echo       → ripples the mids
//   HATS  filtered noise ticks              → needles the highs
//
// The lookahead is a generous 1.25 s: background tabs throttle
// setInterval to ~1 Hz, and a long horizon keeps the loop
// seamless even then.
// ============================================================

import { engine, ensureContext } from './engine.js'
import {
  stepDuration,
  TOTAL_STEPS,
  STEPS_PER_BAR,
  bassNoteForStep,
  arpNoteForStep,
  hatForStep,
} from './synthPatterns.js'

const LOOKAHEAD_SEC = 1.25
const TICK_MS = 100

let synth = null // { master, delay, noiseBuf, timer, step, nextTime }

function makeNoiseBuffer(ctx) {
  const len = Math.floor(ctx.sampleRate * 0.1)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1
  return buf
}

function scheduleBass(ctx, dest, time, freq, durSec) {
  // main body: sawtooth through a closed lowpass
  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.value = freq
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 320
  lp.Q.value = 0.8

  // sub layer an octave below for the chest thump
  const sub = ctx.createOscillator()
  sub.type = 'sine'
  sub.frequency.value = freq / 2

  const gain = ctx.createGain()
  const subGain = ctx.createGain()
  // punchy attack, musical decay — this envelope IS the bass band motion
  gain.gain.setValueAtTime(0, time)
  gain.gain.linearRampToValueAtTime(0.5, time + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.001, time + durSec)
  subGain.gain.setValueAtTime(0, time)
  subGain.gain.linearRampToValueAtTime(0.34, time + 0.02)
  subGain.gain.exponentialRampToValueAtTime(0.001, time + durSec)

  osc.connect(lp).connect(gain).connect(dest)
  sub.connect(subGain).connect(dest)
  osc.start(time)
  sub.start(time)
  osc.stop(time + durSec + 0.05)
  sub.stop(time + durSec + 0.05)
}

function scheduleArp(ctx, dest, delaySend, time, freq) {
  const osc = ctx.createOscillator()
  osc.type = 'square'
  osc.frequency.value = freq
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = freq * 2
  bp.Q.value = 1.2

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, time)
  gain.gain.linearRampToValueAtTime(0.16, time + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16)

  osc.connect(bp).connect(gain)
  gain.connect(dest)
  gain.connect(delaySend) // echo tail fills the odd 16ths
  osc.start(time)
  osc.stop(time + 0.2)
}

function scheduleHat(ctx, dest, noiseBuf, time, kind) {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  // 6 kHz keeps a good chunk of the noise inside the measured
  // 2–8 kHz high band so the hats actually spike the blob
  hp.frequency.value = 6000
  const gain = ctx.createGain()
  const dur = kind === 'open' ? 0.14 : kind === 'ghost' ? 0.025 : 0.04
  const peak = kind === 'open' ? 0.3 : kind === 'ghost' ? 0.1 : 0.22
  gain.gain.setValueAtTime(0, time)
  gain.gain.linearRampToValueAtTime(peak, time + 0.003)
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur)
  src.connect(hp).connect(gain).connect(dest)
  src.start(time)
  src.stop(time + dur + 0.02)
}

export function startSynth() {
  const ctx = ensureContext()
  if (engine.ctx.state === 'suspended') engine.ctx.resume()
  if (synth) {
    // already built — just make it audible again
    engine.mode = 'synth'
    engine.monitor.gain.value = 1
    return
  }

  // master → soft compressor → bus (what you hear is what's measured)
  const master = ctx.createGain()
  master.gain.value = 0.9
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -18
  comp.ratio.value = 6
  master.connect(comp).connect(engine.bus)

  // one shared feedback delay for the arp echo (dotted-8th feel)
  const delay = ctx.createDelay(1)
  delay.delayTime.value = stepDuration() * 3
  const feedback = ctx.createGain()
  feedback.gain.value = 0.35
  const delayLevel = ctx.createGain()
  delayLevel.gain.value = 0.5
  delay.connect(feedback).connect(delay)
  delay.connect(delayLevel).connect(master)

  const noiseBuf = makeNoiseBuffer(ctx)
  const stepDur = stepDuration()

  synth = {
    master,
    delay,
    noiseBuf,
    step: 0,
    nextTime: ctx.currentTime + 0.06,
    timer: 0,
  }

  const tick = () => {
    if (!synth) return
    const horizon = ctx.currentTime + LOOKAHEAD_SEC
    while (synth.nextTime < horizon) {
      const step = synth.step % TOTAL_STEPS
      const stepInBar = step % STEPS_PER_BAR
      const t = synth.nextTime

      const bass = bassNoteForStep(step)
      if (bass) scheduleBass(ctx, master, t, bass.freq, bass.lengthSteps * stepDur * 0.95)

      const arp = arpNoteForStep(step)
      if (arp) scheduleArp(ctx, master, delay, t, arp)

      const hat = hatForStep(stepInBar)
      if (hat) scheduleHat(ctx, master, noiseBuf, t, hat)

      synth.step += 1
      synth.nextTime += stepDur
    }
  }

  tick()
  synth.timer = setInterval(tick, TICK_MS)

  engine.mode = 'synth'
  engine.monitor.gain.value = 1
}

export function stopSynth() {
  if (!synth) return
  clearInterval(synth.timer)
  synth.master.gain.setTargetAtTime(0, engine.ctx.currentTime, 0.05)
  const dead = synth
  synth = null
  // let tails ring out briefly before disconnecting the master
  setTimeout(() => dead.master.disconnect(), 400)
}
