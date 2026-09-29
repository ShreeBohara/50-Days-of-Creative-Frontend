import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { VeilCtl } from './veil.js'
import { rt } from '../state/store.js'

// The silk's frame callback lives in its own component so it can be unmounted
// once the veil is gone — R3F then stops calling it at all.
function VeilClock({ ctl }) {
  useFrame((_, dt) => ctl.frame(dt))
  return null
}

export default function Veil() {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const mesh = useRef(null)
  const ctl = useMemo(() => new VeilCtl(), [])
  // flips once, when the fade completes (never per frame)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    ctl.bind({ camera, canvas: gl.domElement, mesh: mesh.current, onGone: () => setGone(true) })
    rt.veil = ctl
    return () => {
      ctl.unbind()
      rt.veil = null
      ctl.geometry.dispose()
      ctl.material.normalMap?.dispose()
      ctl.material.dispose()
      ctl.depthMaterial.dispose()
    }
  }, [ctl, camera, gl])

  // gone: no mesh to raycast, draw or shadow, and no frame callback
  if (gone) return null
  return (
    <>
      <VeilClock ctl={ctl} />
      <mesh
        ref={mesh}
        geometry={ctl.geometry}
        material={ctl.material}
        customDepthMaterial={ctl.depthMaterial}
        castShadow
        receiveShadow
        frustumCulled={false}
        onPointerDown={(e) => ctl.onPointerDown(e)}
        onPointerOver={() => ctl.hover(true)}
        onPointerOut={() => ctl.hover(false)}
      />
    </>
  )
}
