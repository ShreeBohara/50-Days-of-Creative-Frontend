import { useEffect, useRef, useState } from 'react'
import { Activity, ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './App.css'
import {
  faqs,
  features,
  footerColumns,
  logos,
  navItems,
  pricing,
  stats,
  testimonials,
  workflowSteps,
} from './content'

gsap.registerPlugin(ScrollTrigger)

function App() {
  const [navScrolled, setNavScrolled] = useState(false)
  const heroRef = useRef(null)
  const mockupRef = useRef(null)
  const ctaRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      return undefined
    }

    const ctx = gsap.context(() => {
      gsap.from('.hero-reveal', {
        y: 34,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.11,
      })

      gsap.to('.mockup-float', {
        y: -16,
        duration: 3.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })
    }, heroRef)

    return () => ctx.revert()
  }, [])

  const handleMagnetMove = (event) => {
    if (!ctaRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }
    const rect = ctaRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left - rect.width / 2
    const y = event.clientY - rect.top - rect.height / 2
    gsap.to(ctaRef.current, {
      x: x * 0.16,
      y: y * 0.22,
      duration: 0.28,
      ease: 'power2.out',
    })
  }

  const resetMagnet = () => {
    if (ctaRef.current) {
      gsap.to(ctaRef.current, { x: 0, y: 0, duration: 0.35, ease: 'elastic.out(1, 0.45)' })
    }
  }

  const handleMockupMove = (event) => {
    if (!mockupRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }
    const rect = mockupRef.current.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    gsap.to(mockupRef.current, {
      rotateY: x * 10,
      rotateX: y * -8,
      duration: 0.45,
      ease: 'power2.out',
      transformPerspective: 900,
    })
  }

  const resetMockup = () => {
    if (mockupRef.current) {
      gsap.to(mockupRef.current, {
        rotateX: 0,
        rotateY: 0,
        duration: 0.55,
        ease: 'power2.out',
      })
    }
  }

  return (
    <main className="app-shell">
      <nav className={`site-nav ${navScrolled ? 'is-scrolled' : ''}`} aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="NovaDesk home">
          <span className="brand-mark">N</span>
          NovaDesk
        </a>
        <div className="nav-links">
          {navItems.map((item) => (
            <a href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
        </div>
        <a className="nav-cta" href="#pricing">
          Start free
        </a>
      </nav>

      <section className="hero-section section-frame" id="top" ref={heroRef}>
        <div className="hero-copy">
          <h1 className="hero-reveal">Run every SaaS launch from one live command center.</h1>
          <p className="hero-reveal">
            NovaDesk helps customer-led teams prioritize risk, automate handoffs, and keep
            leadership aligned without another status meeting.
          </p>
          <div className="hero-actions hero-reveal">
            <a
              className="button button-primary magnetic-button"
              href="#pricing"
              onMouseMove={handleMagnetMove}
              onMouseLeave={resetMagnet}
              ref={ctaRef}
            >
              Start free
              <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a className="button button-ghost" href="#workflow">
              See workflow
            </a>
          </div>
        </div>
        <div
          className="product-mockup mockup-float hero-reveal"
          aria-label="NovaDesk product preview"
          onMouseMove={handleMockupMove}
          onMouseLeave={resetMockup}
          ref={mockupRef}
        >
          <div className="mockup-header">
            <span>Command Center</span>
            <span className="live-dot">Live</span>
          </div>
          <div className="mockup-panel">
            <div>
              <span>Launch health</span>
              <strong>92%</strong>
            </div>
            <div className="orbit-widget" aria-hidden="true">
              <span></span>
              <span></span>
              <Activity size={34} />
            </div>
          </div>
          <div className="mockup-list">
            <span>
              <ShieldCheck size={18} aria-hidden="true" />
              Risk signals synced
            </span>
            <span>
              <CheckCircle2 size={18} aria-hidden="true" />
              Owner handoffs queued
            </span>
            <span>
              <Sparkles size={18} aria-hidden="true" />
              Exec summary drafted
            </span>
          </div>
        </div>
      </section>

      <section className="logos-strip" aria-label="Trusted by SaaS teams">
        {logos.map((logo) => (
          <span key={logo}>{logo}</span>
        ))}
      </section>

      <section className="section-frame" id="features">
        <div className="section-heading">
          <h2>One operating layer for the messy middle of growth.</h2>
          <p>Every signal, launch task, and executive question lands in a workspace built for action.</p>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className={`feature-card feature-${feature.tone}`} key={feature.title}>
              {feature.metric && <strong>{feature.metric}</strong>}
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-frame" id="workflow">
        <div className="section-heading">
          <h2>From scattered signals to coordinated execution.</h2>
        </div>
        <div className="workflow-track">
          {workflowSteps.map((step, index) => (
            <article className="workflow-step" key={step.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-frame stats-section" aria-label="NovaDesk impact metrics">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <strong>
              {stat.value}
              {stat.suffix}
            </strong>
            <span>{stat.label}</span>
          </article>
        ))}
      </section>

      <section className="section-frame" id="customers">
        <div className="section-heading">
          <h2>Built for teams that cannot afford fuzzy ownership.</h2>
        </div>
        <div className="testimonial-row">
          {testimonials.slice(0, 3).map((testimonial) => (
            <article className="testimonial-card" key={testimonial.name}>
              <p>{testimonial.quote}</p>
              <strong>{testimonial.name}</strong>
              <span>{testimonial.role}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="section-frame" id="pricing">
        <div className="section-heading">
          <h2>Simple plans for serious launch velocity.</h2>
        </div>
        <div className="pricing-grid">
          {pricing.map((plan) => (
            <article className={`pricing-card ${plan.popular ? 'is-popular' : ''}`} key={plan.name}>
              <h3>{plan.name}</h3>
              <strong>${plan.monthly}</strong>
              <p>{plan.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-frame faq-section">
        <div className="section-heading">
          <h2>Questions before the first launch room?</h2>
        </div>
        <div className="faq-list">
          {faqs.map((faq) => (
            <article className="faq-item" key={faq.question}>
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="footer-section section-frame">
        <div>
          <h2>Make launch work feel lighter.</h2>
          <a className="button button-primary" href="#pricing">
            Start free
          </a>
        </div>
        <div className="footer-columns">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3>{column.title}</h3>
              {column.links.map((link) => (
                <a href="#top" key={link}>
                  {link}
                </a>
              ))}
            </div>
          ))}
        </div>
      </footer>
    </main>
  )
}

export default App
