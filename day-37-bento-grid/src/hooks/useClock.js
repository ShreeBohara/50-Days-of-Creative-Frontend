import { useEffect, useState } from 'react'

const timeZone = 'America/Los_Angeles'

export function useClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 100)
    return () => window.clearInterval(interval)
  }, [])

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const value = (type) => Number(parts.find((part) => part.type === type)?.value ?? 0)
  const seconds = value('second') + now.getMilliseconds() / 1000
  const minutes = value('minute') + seconds / 60
  const hours = (value('hour') % 12) + minutes / 60

  return {
    label: new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(now),
    seconds,
    minutes,
    hours,
  }
}
