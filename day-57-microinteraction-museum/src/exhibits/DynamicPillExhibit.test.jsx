import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DynamicPillExhibit } from './DynamicPillExhibit.jsx'

describe('DynamicPillExhibit', () => {
  it('uses compact buttons, then separate valid player controls', () => {
    const { container } = render(<DynamicPillExhibit />)

    fireEvent.click(screen.getByRole('button', { name: 'Open now playing' }))
    expect(screen.getByRole('button', { name: 'Expand now playing' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Expand now playing' }))
    expect(screen.getByText('Soft Focus')).toBeInTheDocument()
    expect(screen.getByText('Nia Vale')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pause Soft Focus' })).toBeInTheDocument()
    expect(container.querySelector('button button')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Close player' }))
    expect(screen.getByRole('button', { name: 'Open now playing' })).toBeInTheDocument()
  })
})
