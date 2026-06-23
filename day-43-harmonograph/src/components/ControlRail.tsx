import {
  Bookmark,
  GitMerge,
  LayoutGrid,
  Redo2,
  RotateCcw,
  SlidersHorizontal,
  Undo2,
  Waves,
} from 'lucide-react'
import { useStudioStore } from '../store/useStudioStore'
import BlendLab from './BlendLab'
import CollectionPanel from './CollectionPanel'
import GlobalControls from './GlobalControls'
import IconButton from './IconButton'
import Panel from './Panel'
import PendulumControls from './PendulumControls'
import PresetGallery from './PresetGallery'
import ReadoutPanel from './ReadoutPanel'

export default function ControlRail() {
  const undo = useStudioStore((s) => s.undo)
  const redo = useStudioStore((s) => s.redo)
  const reset = useStudioStore((s) => s.reset)
  const canUndo = useStudioStore((s) => s.past.length > 0)
  const canRedo = useStudioStore((s) => s.future.length > 0)
  const collectionCount = useStudioStore((s) => s.collection.length)

  return (
    <aside className="panel-col" aria-label="Controls">
      <div className="rail-actions">
        <IconButton label="Undo" onClick={undo} disabled={!canUndo}>
          <Undo2 size={16} strokeWidth={1.8} />
        </IconButton>
        <IconButton label="Redo" onClick={redo} disabled={!canRedo}>
          <Redo2 size={16} strokeWidth={1.8} />
        </IconButton>
        <span className="rail-actions__spacer" />
        <IconButton label="Reset to default figure" onClick={reset}>
          <RotateCcw size={16} strokeWidth={1.8} />
        </IconButton>
      </div>

      <ReadoutPanel />

      <Panel title="Figures" icon={<LayoutGrid size={15} strokeWidth={1.8} />}>
        <PresetGallery />
      </Panel>

      <Panel title="Pendulums" icon={<Waves size={15} strokeWidth={1.8} />} defaultOpen={false}>
        <PendulumControls />
      </Panel>

      <Panel title="Figure & ink" icon={<SlidersHorizontal size={15} strokeWidth={1.8} />}>
        <GlobalControls />
      </Panel>

      <Panel
        title="Saved"
        icon={<Bookmark size={15} strokeWidth={1.8} />}
        action={<span className="panel-count">{collectionCount}</span>}
      >
        <CollectionPanel />
      </Panel>

      <Panel
        title="Blend lab"
        icon={<GitMerge size={15} strokeWidth={1.8} />}
        defaultOpen={false}
      >
        <BlendLab />
      </Panel>
    </aside>
  )
}
