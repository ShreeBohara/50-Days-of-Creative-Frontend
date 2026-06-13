import { Pause, SkipBack, SkipForward } from 'lucide-react'
import BentoCard from './BentoCard'
import { track } from '../data/portfolioData'

function SpotifyCard() {
  return (
    <BentoCard area="spotify" className="spotify-card" label={`Now playing ${track.title} by ${track.artist}`}>
      <div className="album-art" aria-hidden="true">
        <span className="album-ring"></span>
        <span className="album-core">37</span>
      </div>
      <div className="now-playing">
        <span className="eyebrow">Studio frequency</span>
        <strong>{track.title}</strong>
        <p>{track.artist}</p>
        <div className="track-progress"><span></span></div>
        <div className="track-time"><span>01:48</span><span>{track.duration}</span></div>
      </div>
      <div className="player-controls" aria-hidden="true">
        <SkipBack size={15} />
        <span><Pause size={16} /></span>
        <SkipForward size={15} />
      </div>
      <div className="audio-bars" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <span style={{ '--bar': index }} key={index}></span>
        ))}
      </div>
    </BentoCard>
  )
}

export default SpotifyCard
