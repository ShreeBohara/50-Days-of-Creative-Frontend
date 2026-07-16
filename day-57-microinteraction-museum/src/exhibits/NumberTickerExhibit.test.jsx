import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NumberTickerExhibit } from './NumberTickerExhibit.jsx'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('NumberTickerExhibit', () => {
  it('announces one complete initial currency value', () => {
    render(<NumberTickerExhibit />)

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('$12,486.20')
    expect(status).toHaveAttribute('aria-atomic', 'true')
  })

  it('randomizes within the collection range', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    render(<NumberTickerExhibit />)

    fireEvent.click(screen.getByRole('button', { name: 'Randomize' }))
    expect(screen.getByRole('status')).toHaveTextContent('$48.00')
  })
})
