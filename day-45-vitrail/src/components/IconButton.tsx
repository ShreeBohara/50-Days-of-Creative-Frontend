import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  children: ReactNode
  active?: boolean
  variant?: 'ghost' | 'solid' | 'danger'
}

export default function IconButton({
  label,
  children,
  active = false,
  variant = 'ghost',
  className = '',
  ...rest
}: Props) {
  return (
    <button
      type="button"
      className={`icon-btn icon-btn--${variant} ${active ? 'is-active' : ''} ${className}`.trim()}
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      {...rest}
    >
      {children}
    </button>
  )
}
