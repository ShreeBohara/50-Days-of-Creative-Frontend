import { ScanFace } from 'lucide-react'
import BentoCard from './BentoCard'
import { useTilt } from '../hooks/useTilt'
import portrait from '../assets/editorial-portrait.jpg'

function PhotoCard() {
  const tilt = useTilt(13)

  return (
    <BentoCard area="photo" className="photo-card" label="Fictional editorial portrait">
      <div className="photo-frame" {...tilt}>
        <img src={portrait} alt="Fictional editorial portrait representing the portfolio persona" />
        <span className="photo-wash" aria-hidden="true"></span>
      </div>
      <div className="photo-label">
        <ScanFace size={15} aria-hidden="true" />
        <span>Synthetic portrait / privacy first</span>
      </div>
    </BentoCard>
  )
}

export default PhotoCard
