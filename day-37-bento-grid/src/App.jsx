import BentoCard from './components/BentoCard'
import ClockCard from './components/ClockCard'
import ContactCard from './components/ContactCard'
import ExperienceCard from './components/ExperienceCard'
import FeaturedProjectCard from './components/FeaturedProjectCard'
import GithubCard from './components/GithubCard'
import LocationCard from './components/LocationCard'
import NameCard from './components/NameCard'
import PhotoCard from './components/PhotoCard'
import QuoteCard from './components/QuoteCard'
import SpotifyCard from './components/SpotifyCard'
import TechStackCard from './components/TechStackCard'
import { cardLabels, identity } from './data/portfolioData'
import './App.css'

function PlaceholderCard({ area, index }) {
  return (
    <BentoCard area={area} className="placeholder-card" label={cardLabels[area]}>
      <span className="card-index">0{index}</span>
      <div>
        <span className="eyebrow">{cardLabels[area]}</span>
        <p>Interactive module loading.</p>
      </div>
    </BentoCard>
  )
}

function App() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="wordmark" href="#portfolio" aria-label="Shree Bohara portfolio home">
          <span>SB</span>
          <strong>{identity.role}</strong>
        </a>
        <div className="header-status">
          <span className="status-dot" aria-hidden="true"></span>
          Available for experiments
        </div>
      </header>

      <main id="portfolio" className="portfolio-shell">
        <div className="intro-row">
          <p>Day 37 / Creative operating system</p>
          <p>12 live modules / Pacific time</p>
        </div>
        <section className="bento-grid" aria-label="Interactive portfolio modules">
          <NameCard />
          <ClockCard />
          <ContactCard />
          <ExperienceCard />
          <FeaturedProjectCard />
          <GithubCard />
          <LocationCard />
          <PhotoCard />
          <QuoteCard />
          <SpotifyCard />
          <TechStackCard />
          {Object.keys(cardLabels).filter((area) => !['name', 'clock', 'contact', 'experience', 'featured', 'github', 'location', 'photo', 'quote', 'spotify', 'stack'].includes(area)).map((area, index) => (
            <PlaceholderCard area={area} index={index + 1} key={area} />
          ))}
        </section>
      </main>
    </div>
  )
}

export default App
