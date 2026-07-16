export function ExhibitPlaceholder({ label }) {
  return (
    <div className="exhibit-placeholder" aria-label={`${label} specimen shell`}>
      <span className="exhibit-placeholder__orb" />
      <span>{label}</span>
    </div>
  )
}
