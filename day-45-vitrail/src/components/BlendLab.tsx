import { useMemo, useState } from 'react'
import { ArrowDownToLine, FlaskConical } from 'lucide-react'
import { blendGenomes } from '../domain/blend'
import { windowTitle } from '../domain/compose'
import type { WindowGenome } from '../domain/genome'
import { useStudioStore } from '../store/useStudioStore'
import WindowThumb from './WindowThumb'

interface SlotProps {
  label: string
  genome: WindowGenome | null
  onCapture: () => void
}

function ParentSlot({ label, genome, onCapture }: SlotProps) {
  return (
    <div className="blend__slot">
      <span className="blend__slot-label">{label}</span>
      {genome ? (
        <WindowThumb genome={genome} />
      ) : (
        <div className="blend__slot-empty" aria-hidden="true">
          ?
        </div>
      )}
      <button type="button" className="blend__capture" onClick={onCapture}>
        Use current
      </button>
    </div>
  )
}

export default function BlendLab() {
  const current = useStudioStore((s) => s.genome)
  const loadGenome = useStudioStore((s) => s.loadGenome)
  const [parentA, setParentA] = useState<WindowGenome | null>(null)
  const [parentB, setParentB] = useState<WindowGenome | null>(null)

  const child = useMemo(
    () => (parentA && parentB ? blendGenomes(parentA, parentB) : null),
    [parentA, parentB],
  )

  return (
    <div className="blend">
      <p className="blend__hint">
        Capture two windows, and the lab breeds a deterministic child — same parents, same child, always.
      </p>

      <div className="blend__parents">
        <ParentSlot label="Parent A" genome={parentA} onCapture={() => setParentA(current)} />
        <span className="blend__cross" aria-hidden="true">
          ×
        </span>
        <ParentSlot label="Parent B" genome={parentB} onCapture={() => setParentB(current)} />
      </div>

      {child && (
        <div className="blend__child">
          <div className="blend__child-preview">
            <WindowThumb genome={child} />
            <div className="blend__child-meta">
              <span className="blend__child-title">{windowTitle(child)}</span>
              <span className="blend__child-sub mono-num">seed “{child.seed}”</span>
            </div>
          </div>
          <button type="button" className="btn-primary blend__adopt" onClick={() => loadGenome(child)}>
            <ArrowDownToLine size={15} strokeWidth={1.8} aria-hidden="true" />
            <span>Raise this child</span>
          </button>
        </div>
      )}

      {!child && (
        <p className="blend__waiting">
          <FlaskConical size={14} strokeWidth={1.8} aria-hidden="true" />
          {parentA || parentB ? 'One more parent needed…' : 'The crucible stands empty.'}
        </p>
      )}
    </div>
  )
}
