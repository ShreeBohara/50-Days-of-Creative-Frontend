import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SmartButtonExhibit } from './SmartButtonExhibit.jsx'

afterEach(() => {
  vi.useRealTimers()
})

describe('SmartButtonExhibit', () => {
  it('runs the timed state cycle and ignores duplicate activation', () => {
    vi.useFakeTimers()
    render(<SmartButtonExhibit />)

    const button = screen.getByRole('button', { name: 'Publish exhibit' })
    button.focus()
    fireEvent.click(button)
    expect(screen.getByRole('button', { name: 'Publishing' })).toHaveAttribute('aria-busy', 'true')

    act(() => vi.advanceTimersByTime(400))
    fireEvent.click(screen.getByRole('button', { name: 'Publishing' }))
    act(() => vi.advanceTimersByTime(500))
    expect(screen.getByRole('button', { name: 'Published' })).toHaveFocus()

    act(() => vi.advanceTimersByTime(1400))
    expect(screen.getByRole('button', { name: 'Publish exhibit' })).toHaveAttribute('aria-disabled', 'false')
  })

  it('starts the cycle when a replay remounts the specimen', () => {
    vi.useFakeTimers()
    render(<SmartButtonExhibit replayKey={1} />)

    expect(screen.getByRole('button', { name: 'Publishing' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(900))
    expect(screen.getByRole('button', { name: 'Published' })).toBeInTheDocument()
  })

  it('cleans up its scheduled work when unmounted', () => {
    vi.useFakeTimers()
    const { unmount } = render(<SmartButtonExhibit />)
    fireEvent.click(screen.getByRole('button', { name: 'Publish exhibit' }))
    unmount()

    expect(() => act(() => vi.runAllTimers())).not.toThrow()
  })
})
