import { Physics } from '@react-three/rapier'
import PhysicsClock from './PhysicsClock.jsx'
import Tray from './Tray.jsx'
import Bowl from './Bowl.jsx'
import Breakage from './Breakage.jsx'
import FitLayer from './FitLayer.jsx'
import CraftLayer from './Craft.jsx'
import Shelf from './Shelf.jsx'

// Everything that needs Rapier (its WASM is ~2 MB inlined) lives in this lazily
// loaded chunk, so the silk veil can draw from the first, lighter one.
export default function PhysicsScene() {
  return (
    <>
      <Physics paused timeStep="vary" gravity={[0, -9.81, 0]}>
        <PhysicsClock />
        <Tray />
        <Bowl />
        <Breakage />
        <FitLayer />
        <CraftLayer />
      </Physics>
      <Shelf />
    </>
  )
}
