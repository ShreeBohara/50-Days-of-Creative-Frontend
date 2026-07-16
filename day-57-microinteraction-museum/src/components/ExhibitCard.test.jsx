import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ExhibitCard } from './ExhibitCard.jsx'

describe('ExhibitCard', () => {
  it('replays only its own specimen', async () => {
    const user = userEvent.setup()

    render(
      <ExhibitCard number="01" title="Test motion" caption="A caption" hint="Try it">
        {({ replayKey }) => <output data-testid="replay-key">{replayKey}</output>}
      </ExhibitCard>,
    )

    expect(screen.getByTestId('replay-key')).toHaveTextContent('0')
    await user.click(screen.getByRole('button', { name: 'Replay Test motion' }))
    expect(screen.getByTestId('replay-key')).toHaveTextContent('1')
  })
})
