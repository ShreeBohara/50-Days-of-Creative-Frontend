import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ToastExhibit } from './ToastExhibit.jsx'

describe('ToastExhibit', () => {
  it('expands and pauses the queue from pointer or keyboard attention', () => {
    render(<ToastExhibit />)

    const stack = screen.getByRole('region', { name: 'Museum notifications' })
    const frontToast = screen.getByRole('group', { name: /Annotation saved/ })
    const closeButton = screen.getByRole('button', { name: /Dismiss Annotation saved/ })

    fireEvent.pointerEnter(frontToast)
    expect(stack).toHaveAttribute('data-expanded')
    expect(stack).toHaveAttribute('data-paused')

    fireEvent.pointerLeave(frontToast)
    expect(stack).not.toHaveAttribute('data-paused')

    fireEvent.focus(closeButton)
    expect(stack).toHaveAttribute('data-expanded')
    expect(stack).toHaveAttribute('data-paused')
  })
})
