import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InkTabsExhibit } from './InkTabsExhibit.jsx'

describe('InkTabsExhibit', () => {
  it('exposes a complete ARIA tab interface', () => {
    render(<InkTabsExhibit />)

    expect(screen.getAllByRole('tab')).toHaveLength(4)
    expect(screen.getByRole('tab', { name: 'Craft' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Craft')
  })

  it('selects and focuses tabs with arrows, Home, and End', () => {
    render(<InkTabsExhibit />)
    const craft = screen.getByRole('tab', { name: 'Craft' })

    fireEvent.keyDown(craft, { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: 'Timing' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Timing' })).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Timing' }), { key: 'End' })
    expect(screen.getByRole('tab', { name: 'Access' })).toHaveFocus()

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Access' }), { key: 'Home' })
    expect(screen.getByRole('tab', { name: 'Craft' })).toHaveFocus()
  })
})
