import { useState } from 'react'
import { motion } from 'motion/react'
import { ExhibitCard } from './components/ExhibitCard.jsx'
import { ToastExhibit } from './exhibits/ToastExhibit.jsx'
import { DrawerExhibit } from './exhibits/DrawerExhibit.jsx'
import { InkTabsExhibit } from './exhibits/InkTabsExhibit.jsx'
import { SmartButtonExhibit } from './exhibits/SmartButtonExhibit.jsx'
import { NumberTickerExhibit } from './exhibits/NumberTickerExhibit.jsx'
import { HoldConfirmExhibit } from './exhibits/HoldConfirmExhibit.jsx'
import { ReactionBurstExhibit } from './exhibits/ReactionBurstExhibit.jsx'
import { DynamicPillExhibit } from './exhibits/DynamicPillExhibit.jsx'

const exhibits = [
  {
    number: '01',
    title: 'Stacked Toasts',
    caption: 'A queue becomes spatial: time, depth, and intent must stay in sync.',
    hint: 'Add · hover · swipe',
    Component: ToastExhibit,
  },
  {
    number: '02',
    title: 'Drag Drawer',
    caption: 'The sheet has to follow your hand, then make the right decision on release.',
    hint: 'Open · pull · release',
    Component: DrawerExhibit,
  },
  {
    number: '03',
    title: 'Magic Ink Tabs',
    caption: 'Two spring edges turn a plain selection into something that feels liquid.',
    hint: 'Select · use arrow keys',
    Component: InkTabsExhibit,
  },
  {
    number: '04',
    title: 'Smart Button',
    caption: 'Content, color, and measured width must morph without disturbing focus.',
    hint: 'Publish an exhibit',
    Component: SmartButtonExhibit,
  },
  {
    number: '05',
    title: 'Number Ticker',
    caption: 'Every glyph moves alone while the formatted number remains one readable value.',
    hint: 'Randomize the collection',
    Component: NumberTickerExhibit,
  },
  {
    number: '06',
    title: 'Hold to Confirm',
    caption: 'Progress must feel physical, cancellable, and unquestionably complete.',
    hint: 'Press and hold for 1.2s',
    Component: HoldConfirmExhibit,
  },
  {
    number: '07',
    title: 'Reaction Burst',
    caption: 'A tiny tap coordinates impulse, gravity, cleanup, and repeated delight.',
    hint: 'Tap quickly, more than once',
    Component: ReactionBurstExhibit,
  },
  {
    number: '08',
    title: 'Dynamic Pill',
    caption: 'Three information densities share one silhouette without an abrupt jump.',
    hint: 'Cycle through three states',
    Component: DynamicPillExhibit,
  },
]

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="app-canvas" data-drawer-open={drawerOpen || undefined}>
      <a className="skip-link" href="#exhibits">Skip to exhibits</a>
      <motion.div
        className="museum-shell"
        animate={{ scale: drawerOpen ? 0.985 : 1, borderRadius: drawerOpen ? 24 : 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 36 }}
      >
        <header className="museum-header">
          <div className="museum-header__topline">
            <span>DAY 57 / 65</span>
            <span>INTERFACE STUDIES · COLLECTION 08 · 2026</span>
          </div>
          <div className="museum-header__title">
            <h1>
              <span>Micro /</span>
              <em>Museum</em>
            </h1>
            <div className="museum-header__aside">
              <span className="museum-header__mark" aria-hidden="true">57</span>
              <p>Eight studies in interface physics, rebuilt by hand.</p>
              <a href="#exhibits">Enter the collection <span aria-hidden="true">↓</span></a>
            </div>
          </div>
        </header>

        <section className="collection-register" aria-label="Collection register">
          <div>
            <span className="collection-register__eyebrow">Curator’s note</span>
            <p>
              Good motion is felt before it is noticed. Each object below isolates one
              small decision—when to resist, when to follow, and when to get out of the way.
            </p>
          </div>
          <dl>
            <div><dt>Objects</dt><dd>08</dd></div>
            <div><dt>Medium</dt><dd>DOM / SVG</dd></div>
            <div><dt>Engine</dt><dd>Spring</dd></div>
          </dl>
        </section>

        <main id="exhibits" className="exhibit-grid">
          {exhibits.map(({ Component, ...exhibit }) => (
            <ExhibitCard key={exhibit.number} {...exhibit} tone={Number(exhibit.number) % 3 === 0 ? 'ink' : 'paper'}>
              {({ replayKey }) => (
                <Component
                  key={replayKey}
                  replayKey={replayKey}
                  onOpenChange={exhibit.number === '02' ? setDrawerOpen : undefined}
                />
              )}
            </ExhibitCard>
          ))}
        </main>

        <footer className="museum-footer">
          <div className="museum-footer__lead">
            <p>Micro-Interaction Museum</p>
            <h2>Built after the people who made product motion feel inevitable.</h2>
          </div>
          <nav className="museum-footer__credits" aria-label="Pattern credits">
            <a href="https://sonner.emilkowal.ski/">Sonner <span aria-hidden="true">↗</span></a>
            <a href="https://vaul.emilkowal.ski/">Vaul <span aria-hidden="true">↗</span></a>
            <a href="https://family.co/">Family <span aria-hidden="true">↗</span></a>
          </nav>
          <div className="museum-footer__legal">
            <span>All eight studies are original, from-scratch recreations—not imported components.</span>
            <a href="../">Return to the project archive ↑</a>
          </div>
        </footer>
      </motion.div>
    </div>
  )
}
