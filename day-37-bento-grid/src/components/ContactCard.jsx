import { ArrowUpRight } from 'lucide-react'
import { SiGithub } from 'react-icons/si'
import BentoCard from './BentoCard'
import { links } from '../data/portfolioData'

function ContactCard() {
  return (
    <BentoCard area="contact" className="contact-card" label="Contact Shree Bohara on GitHub">
      <span className="contact-orbit contact-orbit-one" aria-hidden="true"></span>
      <span className="contact-orbit contact-orbit-two" aria-hidden="true"></span>
      <div className="contact-copy">
        <span className="eyebrow">Open channel</span>
        <h2>Let’s build something<br />with a pulse.</h2>
      </div>
      <a href={links.github} target="_blank" rel="noreferrer">
        <span className="contact-icon"><SiGithub size={20} aria-hidden="true" /></span>
        <span className="contact-default">GitHub</span>
        <span className="contact-reveal">Let’s talk</span>
        <ArrowUpRight size={18} aria-hidden="true" />
      </a>
    </BentoCard>
  )
}

export default ContactCard
