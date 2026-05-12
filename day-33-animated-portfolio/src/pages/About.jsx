import { motion } from 'framer-motion'
import './About.css'

/* ---------- data ---------- */
const skills = [
  { name: 'React / Next.js', level: 95 },
  { name: 'Three.js / WebGL', level: 85 },
  { name: 'Motion Design', level: 90 },
  { name: 'TypeScript', level: 88 },
  { name: 'CSS / Design Systems', level: 92 },
  { name: 'Node.js / APIs', level: 78 },
]

const timeline = [
  {
    year: '2025',
    title: 'Senior Creative Developer',
    company: 'Freelance',
    description: 'Leading creative frontend projects for global clients, specializing in immersive web experiences.',
  },
  {
    year: '2024',
    title: 'Frontend Engineer',
    company: 'Design Studio Co.',
    description: 'Built award-winning interactive websites with GSAP, Three.js, and React. Led the motion design system.',
  },
  {
    year: '2023',
    title: 'UI Developer',
    company: 'TechStart Inc.',
    description: 'Developed responsive SaaS dashboards and data visualization tools for enterprise clients.',
  },
  {
    year: '2022',
    title: 'Junior Developer',
    company: 'Digital Agency',
    description: 'Started career building marketing sites and learning the craft of creative development.',
  },
]

const contacts = [
  { label: 'Email', value: 'hello@portfolio.dev', href: 'mailto:hello@portfolio.dev' },
  { label: 'GitHub', value: 'github.com/creative-dev', href: 'https://github.com' },
  { label: 'LinkedIn', value: 'linkedin.com/in/creative-dev', href: 'https://linkedin.com' },
  { label: 'Twitter', value: '@creative_dev', href: 'https://twitter.com' },
]

/* ---------- animation variants ---------- */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] },
  }),
}

const barVariant = {
  hidden: { width: 0 },
  visible: (level) => ({
    width: `${level}%`,
    transition: { duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] },
  }),
}

export default function About() {
  return (
    <div className="page about-page">
      {/* Header */}
      <section className="about-header container">
        <motion.span
          className="text-label"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          About Me
        </motion.span>
        <motion.h1
          className="text-h1"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          Crafting digital experiences that move.
        </motion.h1>
      </section>

      {/* Split intro */}
      <section className="about-intro container">
        <motion.div
          className="about-intro-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          <motion.div className="about-portrait" variants={fadeUp} custom={0}>
            <div
              className="about-portrait-image"
              style={{
                background: 'linear-gradient(135deg, #18181B 0%, #3F3F46 50%, #2563EB 100%)',
              }}
            />
          </motion.div>
          <motion.div className="about-bio" variants={fadeUp} custom={1}>
            <p className="about-bio-text text-body">
              I&apos;m a creative developer passionate about the intersection of design and
              engineering. I build interfaces that don&apos;t just function — they feel alive.
            </p>
            <p className="about-bio-text text-body">
              With a background in both design and computer science, I bring a unique
              perspective to every project. I believe the best digital experiences are
              the ones that surprise and delight, where every transition has purpose
              and every interaction tells a story.
            </p>
            <p className="about-bio-text text-body">
              When I&apos;m not coding, I&apos;m exploring generative art, experimenting with
              shaders, or contributing to open-source creative tools.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* Skills */}
      <section className="about-skills container section">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          <motion.h2 className="text-h2 about-section-title" variants={fadeUp} custom={0}>
            Skills & Expertise
          </motion.h2>
          <div className="about-skills-list">
            {skills.map((skill, i) => (
              <motion.div
                key={skill.name}
                className="about-skill"
                variants={fadeUp}
                custom={i + 1}
              >
                <div className="about-skill-header">
                  <span className="about-skill-name">{skill.name}</span>
                  <span className="about-skill-level text-small">{skill.level}%</span>
                </div>
                <div className="about-skill-track">
                  <motion.div
                    className="about-skill-bar"
                    variants={barVariant}
                    custom={skill.level}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Timeline */}
      <section className="about-timeline container section">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          <motion.h2 className="text-h2 about-section-title" variants={fadeUp} custom={0}>
            Experience
          </motion.h2>
          <div className="about-timeline-list">
            {/* vertical line */}
            <motion.div
              className="about-timeline-line"
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            />

            {timeline.map((item, i) => (
              <motion.div
                key={i}
                className={`about-timeline-item ${i % 2 === 0 ? 'about-timeline-left' : 'about-timeline-right'}`}
                variants={fadeUp}
                custom={i + 1}
              >
                <div className="about-timeline-dot" />
                <div className="about-timeline-card">
                  <span className="about-timeline-year text-label">{item.year}</span>
                  <h3 className="about-timeline-role text-h3">{item.title}</h3>
                  <span className="about-timeline-company text-small">{item.company}</span>
                  <p className="about-timeline-desc text-body">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Contact */}
      <section className="about-contact container section">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          <motion.h2 className="text-h2 about-section-title" variants={fadeUp} custom={0}>
            Get in Touch
          </motion.h2>
          <motion.p className="about-contact-sub text-body" variants={fadeUp} custom={1}>
            Interested in working together? Let&apos;s connect.
          </motion.p>
          <div className="about-contact-links">
            {contacts.map((c, i) => (
              <motion.a
                key={c.label}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="about-contact-item"
                variants={fadeUp}
                custom={i + 2}
                data-cursor="link"
              >
                <span className="text-label">{c.label}</span>
                <span className="about-contact-value">{c.value}</span>
                <svg className="about-contact-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </motion.a>
            ))}
          </div>
        </motion.div>
      </section>
    </div>
  )
}
