import BentoCard from './BentoCard'
import { useClock } from '../hooks/useClock'

function ClockCard() {
  const clock = useClock()

  return (
    <BentoCard area="clock" className="clock-card" label={`Pacific time ${clock.label}`}>
      <div className="clock-heading">
        <span className="eyebrow">Pacific time</span>
        <strong>{clock.label}</strong>
      </div>
      <div className="clock-face" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <span className="clock-tick" style={{ '--tick': index }} key={index}></span>
        ))}
        <span className="clock-hand clock-hour" style={{ transform: `rotate(${clock.hours * 30}deg)` }}></span>
        <span className="clock-hand clock-minute" style={{ transform: `rotate(${clock.minutes * 6}deg)` }}></span>
        <span className="clock-hand clock-second" style={{ transform: `rotate(${clock.seconds * 6}deg)` }}></span>
        <span className="clock-pin"></span>
      </div>
    </BentoCard>
  )
}

export default ClockCard
