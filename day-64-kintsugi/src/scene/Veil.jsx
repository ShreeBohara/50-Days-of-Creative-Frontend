import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { VeilCtl } from './veil.js'
import { rt } from '../state/store.js'

export default function Veil() {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const mesh = useRef(null)
  const ctl = useMemo(() => new VeilCtl(), [])

  useEffect(() => {
    ctl.bind({ camera, canvas: gl.domElement, mesh: mesh.current })
    rt.veil = ctl
    return () => {
      ctl.unbind()
      rt.veil = null
    }
  }, [ctl, camera, gl])

  useFrame((_, dt) => ctl.frame(dt))

  return (
    <mesh
      ref={mesh}
      geometry={ctl.geometry}
      material={ctl.material}
      castShadow
      receiveShadow
      frustumCulled={false}
      onPointerDown={(e) => ctl.onPointerDown(e)}
      onPointerOver={() => ctl.hover(true)}
      onPointerOut={() => ctl.hover(false)}
    />
  )
}
