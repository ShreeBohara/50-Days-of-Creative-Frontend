import { useEffect, useState } from 'react'
import { GitCommitHorizontal } from 'lucide-react'
import { SiGithub } from 'react-icons/si'
import BentoCard from './BentoCard'
import { githubStats, links } from '../data/portfolioData'

const activity = Array.from({ length: 70 }, (_, index) => {
  const wave = Math.sin(index * 1.73) + Math.cos(index * 0.61)
  return Math.max(0, Math.min(4, Math.round(wave + 2)))
})

function GithubCard() {
  const [commitCount, setCommitCount] = useState(0)

  useEffect(() => {
    const started = performance.now()
    const duration = 900
    let frame
    const tick = (now) => {
      const progress = Math.min(1, (now - started) / duration)
      setCommitCount(Math.round(githubStats.commits * (1 - (1 - progress) ** 3)))
      if (progress < 1) frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <BentoCard area="github" className="github-card" label={`${githubStats.commits} GitHub commits`}>
      <div className="github-topline">
        <span className="github-icon"><SiGithub size={21} aria-hidden="true" /></span>
        <a href={links.github} target="_blank" rel="noreferrer">@ShreeBohara</a>
      </div>
      <div className="commit-total">
        <span><GitCommitHorizontal size={15} aria-hidden="true" /> Commits logged</span>
        <strong>{commitCount}<em>+</em></strong>
      </div>
      <div className="heatmap" aria-label="Generated contribution activity visualization">
        {activity.map((level, index) => (
          <span data-level={level} key={index}></span>
        ))}
      </div>
      <div className="github-footer">
        <span><strong>{githubStats.streak}</strong> day streak</span>
        <span><strong>{githubStats.repositories}</strong> repositories</span>
      </div>
    </BentoCard>
  )
}

export default GithubCard
