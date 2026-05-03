import { useState, useEffect, useRef } from 'react'

/**
 * useAmbientDrone — Creates a continuous psychedelic audio drone using Web Audio API.
 * The pitch slightly modulates based on the provided speed.
 *
 * @param {boolean} isPlaying - Toggle audio on/off
 * @param {number} speed - Current flight speed (0 to 1)
 */
export default function useAmbientDrone(isPlaying, speed) {
  const ctxRef = useRef(null)
  const osc1Ref = useRef(null)
  const osc2Ref = useRef(null)
  const filterRef = useRef(null)
  const gainNodeRef = useRef(null)

  /* Initialize audio context and nodes once */
  useEffect(() => {
    /* Need user interaction first to start audio context */
    if (!isPlaying && !ctxRef.current) return

    if (!ctxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      ctxRef.current = new Ctx()

      /* Gain Node (Master Volume) */
      const gain = ctxRef.current.createGain()
      gain.gain.value = 0
      gain.connect(ctxRef.current.destination)
      gainNodeRef.current = gain

      /* Low-pass filter for warmth */
      const filter = ctxRef.current.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 400
      filter.Q.value = 5
      filter.connect(gain)
      filterRef.current = filter

      /* Oscillator 1 (Base Drone) */
      const osc1 = ctxRef.current.createOscillator()
      osc1.type = 'sawtooth'
      osc1.frequency.value = 55 // A1
      osc1.connect(filter)
      osc1.start()
      osc1Ref.current = osc1

      /* Oscillator 2 (Slightly detuned for thickness) */
      const osc2 = ctxRef.current.createOscillator()
      osc2.type = 'square'
      osc2.frequency.value = 55.5 // slightly detuned
      osc2.connect(filter)
      osc2.start()
      osc2Ref.current = osc2
    }
  }, [isPlaying])

  /* Handle Play/Stop (Fade In/Out) */
  useEffect(() => {
    if (!ctxRef.current || !gainNodeRef.current) return

    const now = ctxRef.current.currentTime
    const gain = gainNodeRef.current.gain

    /* Cancel scheduled changes and fade */
    gain.cancelScheduledValues(now)
    if (isPlaying) {
      if (ctxRef.current.state === 'suspended') {
        ctxRef.current.resume()
      }
      gain.setValueAtTime(gain.value, now)
      gain.linearRampToValueAtTime(0.15, now + 2.0) // 2s fade in
    } else {
      gain.setValueAtTime(gain.value, now)
      gain.linearRampToValueAtTime(0, now + 1.0) // 1s fade out
    }
  }, [isPlaying])

  /* Modulate pitch based on speed */
  useEffect(() => {
    if (!ctxRef.current || !osc1Ref.current || !osc2Ref.current || !filterRef.current) return

    const now = ctxRef.current.currentTime

    /* Base frequency 55Hz, increases up to 110Hz at max speed */
    const targetFreq = 55 + speed * 55

    osc1Ref.current.frequency.setTargetAtTime(targetFreq, now, 0.5)
    osc2Ref.current.frequency.setTargetAtTime(targetFreq + 0.5, now, 0.5)
    
    /* Open the filter as speed increases */
    filterRef.current.frequency.setTargetAtTime(400 + speed * 800, now, 0.5)
  }, [speed])

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      if (ctxRef.current) {
        ctxRef.current.close()
      }
    }
  }, [])
}
