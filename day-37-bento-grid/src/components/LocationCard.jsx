import { MapPin } from 'lucide-react'
import BentoCard from './BentoCard'

function LocationCard() {
  return (
    <BentoCard area="location" className="location-card" label="Demo location: Pacific coast">
      <div className="map-grid" aria-hidden="true">
        <span className="map-road map-road-one"></span>
        <span className="map-road map-road-two"></span>
        <span className="map-road map-road-three"></span>
        <span className="map-coast"></span>
        <span className="map-pulse"></span>
        <MapPin className="map-pin" size={25} />
      </div>
      <div className="location-copy">
        <span className="eyebrow">Demo coordinates</span>
        <strong>Pacific Coast</strong>
        <p>Designing between ocean air and an unreasonable number of browser tabs.</p>
      </div>
    </BentoCard>
  )
}

export default LocationCard
