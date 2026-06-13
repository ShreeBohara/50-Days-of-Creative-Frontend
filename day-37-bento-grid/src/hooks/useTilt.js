import { useState } from 'react'
import { useReducedMotion } from './useReducedMotion'

export function useTilt(strength = 8) {
  const reducedMotion = useReducedMotion()
  const [transform, setTransform] = useState('perspective(700px) rotateX(0deg) rotateY(0deg)')

  const onPointerMove = (event) => {
    if (event.pointerType === 'touch' || reducedMotion) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width - 0.5
    const y = (event.clientY - bounds.top) / bounds.height - 0.5
    setTransform(`perspective(700px) rotateX(${-y * strength}deg) rotateY(${x * strength}deg)`)
  }

  const onPointerLeave = () => setTransform('perspective(700px) rotateX(0deg) rotateY(0deg)')

  return { style: { transform }, onPointerMove, onPointerLeave }
}
