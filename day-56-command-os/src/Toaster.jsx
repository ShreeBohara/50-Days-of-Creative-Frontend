import { createPortal } from 'react-dom'
import Icon from './icons.jsx'

// Stacked toasts, bottom-centre, portalled to the body. Click to dismiss early.
export default function Toaster({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return createPortal(
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          className="toast"
          data-leaving={t.leaving || undefined}
          onClick={() => onDismiss(t.id)}
        >
          <span className="toast-icon"><Icon name={t.icon} /></span>
          <span className="toast-msg">{t.message}</span>
        </button>
      ))}
    </div>,
    document.body,
  )
}
