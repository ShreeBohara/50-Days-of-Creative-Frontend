import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface Props {
  title: string
  icon?: ReactNode
  defaultOpen?: boolean
  action?: ReactNode
  children: ReactNode
}

export default function Panel({ title, icon, defaultOpen = true, action, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const bodyId = useId()

  return (
    <section className={`panel-block ${open ? 'is-open' : ''}`}>
      <div className="panel-block__bar">
        <button
          type="button"
          className="panel-block__toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((o) => !o)}
        >
          {icon && <span className="panel-block__icon">{icon}</span>}
          <span className="panel-block__title">{title}</span>
          <ChevronDown className="panel-block__chevron" size={16} strokeWidth={1.8} aria-hidden="true" />
        </button>
        {action && <div className="panel-block__action">{action}</div>}
      </div>
      {open && (
        <div className="panel-block__body" id={bodyId}>
          {children}
        </div>
      )}
    </section>
  )
}
