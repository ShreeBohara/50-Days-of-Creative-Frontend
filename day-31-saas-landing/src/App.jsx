import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ListChecks,
  PlugZap,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
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

const workflowIcons = [PlugZap, ListChecks, Send]

function App() {
  const [navScrolled, setNavScrolled] = useState(false)
  const [testimonialIndex, setTestimonialIndex] = useState(0)
  const [testimonialPaused, setTestimonialPaused] = useState(false)
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [activeFaq, setActiveFaq] = useState(0)
  const [stickyVisible, setStickyVisible] = useState(false)
  const [stickyCompact, setStickyCompact] = useState(false)
  const heroRef = useRef(null)
  const mockupRef = useRef(null)
  const ctaRef = useRef(null)
  const testimonialRef = useRef(null)
  const cursorRef = useRef(null)
  const dragRef = useRef({ active: false, startX: 0, startScroll: 0 })

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      const heroHeight = heroRef.current?.offsetHeight || window.innerHeight
      setStickyVisible(window.scrollY > heroHeight * 0.72)
      setStickyCompact(window.scrollY > heroHeight * 1.45)
    }
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

  useEffect(() => {
    if (testimonialPaused) {
      return undefined
    }
    const timer = window.setInterval(() => {
      setTestimonialIndex((current) => (current + 1) % testimonials.length)
    }, 4200)
    return () => window.clearInterval(timer)
  }, [testimonialPaused])

  useEffect(() => {
    const carousel = testimonialRef.current
    const card = carousel?.children[testimonialIndex]
    if (!carousel || !card) {
      return
    }
    carousel.scrollTo({
      left: card.offsetLeft - carousel.offsetLeft,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }, [testimonialIndex])

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    gsap.utils.toArray('.price-value').forEach((node) => {
      const target = Number(node.dataset.price)
      const current =
        billingCycle === 'monthly' ? Number(node.dataset.yearly) : Number(node.dataset.monthly)
      const counter = { value: current }
      gsap.to(counter, {
        value: target,
        duration: reduceMotion ? 0 : 0.55,
        ease: 'power2.out',
        onUpdate: () => {
          node.textContent = `$${Math.round(counter.value)}`
        },
      })
    })
  }, [billingCycle])

  useEffect(() => {
    gsap.utils.toArray('.faq-answer').forEach((answer, index) => {
      const isOpen = index === activeFaq
      gsap.to(answer, {
        height: isOpen ? answer.scrollHeight : 0,
        duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 0.32,
        ease: 'power2.out',
      })
    })
  }, [activeFaq])

  useEffect(() => {
    const cursor = cursorRef.current
    const finePointer = window.matchMedia('(pointer: fine)').matches
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!cursor || !finePointer || reduceMotion) {
      return undefined
    }

    const move = (event) => {
      gsap.to(cursor, {
        x: event.clientX,
        y: event.clientY,
        duration: 0.18,
        ease: 'power2.out',
      })
    }
    const hover = (event) => {
      cursor.classList.toggle('is-hovering', Boolean(event.target.closest('a, button')))
    }

    window.addEventListener('pointermove', move)
    document.addEventListener('mouseover', hover)
    return () => {
      window.removeEventListener('pointermove', move)
      document.removeEventListener('mouseover', hover)
    }
  }, [])

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      return undefined
    }

    const ctx = gsap.context(() => {
      gsap.utils.toArray('.feature-card').forEach((card, index) => {
        const directions = [
          { x: -72, y: 26 },
          { x: 72, y: 18 },
          { x: 0, y: 64 },
          { x: -52, y: 0 },
          { x: 52, y: 0 },
          { x: 0, y: 58 },
        ]
        gsap.from(card, {
          ...directions[index % directions.length],
          opacity: 0,
          duration: 0.85,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 82%',
          },
        })
      })

      gsap.fromTo(
        '.workflow-line',
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.1,
          ease: 'power2.inOut',
          scrollTrigger: {
            trigger: '.workflow-track',
            start: 'top 72%',
          },
        },
      )

      gsap.from('.workflow-icon', {
        y: 18,
        scale: 0,
        rotate: -18,
        opacity: 0,
        duration: 0.58,
        ease: 'back.out(1.8)',
        stagger: 0.18,
        scrollTrigger: {
          trigger: '.workflow-track',
          start: 'top 70%',
        },
      })

      gsap.utils.toArray('.stat-card').forEach((card) => {
        const value = card.querySelector('.stat-value')
        const ring = card.querySelector('.progress-ring-fill')
        const target = Number(value.dataset.value)
        const suffix = value.dataset.suffix
        const progress = Number(ring.dataset.progress)
        const counter = { value: 0 }

        gsap.to(counter, {
          value: target,
          duration: 1.4,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 84%',
            once: true,
          },
          onUpdate: () => {
            const decimals = target % 1 === 0 ? 0 : 1
            value.textContent = `${counter.value.toFixed(decimals)}${suffix}`
          },
        })

        gsap.to(ring, {
          strokeDashoffset: 289 - (289 * progress) / 100,
          duration: 1.35,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 84%',
            once: true,
          },
        })
      })
    })

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

  const handleTestimonialDown = (event) => {
    const carousel = testimonialRef.current
    if (!carousel) {
      return
    }
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startScroll: carousel.scrollLeft,
    }
    carousel.setPointerCapture(event.pointerId)
    carousel.classList.add('is-dragging')
    setTestimonialPaused(true)
  }

  const handleTestimonialMove = (event) => {
    const carousel = testimonialRef.current
    if (!carousel || !dragRef.current.active) {
      return
    }
    carousel.scrollLeft = dragRef.current.startScroll - (event.clientX - dragRef.current.startX)
  }

  const handleTestimonialUp = (event) => {
    const carousel = testimonialRef.current
    if (!carousel || !dragRef.current.active) {
      return
    }
    dragRef.current.active = false
    carousel.releasePointerCapture(event.pointerId)
    carousel.classList.remove('is-dragging')
    const cards = Array.from(carousel.children)
    const nearest = cards.reduce(
      (best, card, index) => {
        const distance = Math.abs(card.offsetLeft - carousel.scrollLeft)
        return distance < best.distance ? { index, distance } : best
      },
      { index: 0, distance: Number.POSITIVE_INFINITY },
    )
    setTestimonialIndex(nearest.index)
  }

  return (
    <main className="app-shell">
      <div className="custom-cursor" ref={cursorRef} aria-hidden="true"></div>
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
        <div className="logo-track">
          {[...logos, ...logos].map((logo, index) => (
            <span key={`${logo}-${index}`}>{logo}</span>
          ))}
        </div>
      </section>

      <section className="section-frame" id="features">
        <div className="section-heading">
          <h2>One operating layer for the messy middle of growth.</h2>
          <p>Every signal, launch task, and executive question lands in a workspace built for action.</p>
        </div>
        <div className="feature-grid">
          {features.map((feature, index) => (
            <article className={`feature-card feature-${feature.tone}`} key={feature.title}>
              <span className="feature-index">{String(index + 1).padStart(2, '0')}</span>
              {feature.metric && <strong>{feature.metric}</strong>}
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-frame workflow-section" id="workflow">
        <div className="section-heading">
          <h2>From scattered signals to coordinated execution.</h2>
        </div>
        <div className="workflow-track">
          <span className="workflow-line" aria-hidden="true"></span>
          {workflowSteps.map((step, index) => (
            <article className="workflow-step" key={step.title}>
              <span className="workflow-number">{String(index + 1).padStart(2, '0')}</span>
              <span className="workflow-icon" aria-hidden="true">
                {(() => {
                  const Icon = workflowIcons[index]
                  return <Icon size={24} />
                })()}
              </span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-frame stats-section" aria-label="NovaDesk impact metrics">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <svg className="progress-ring" viewBox="0 0 120 120" aria-hidden="true">
              <circle className="progress-ring-track" cx="60" cy="60" r="46"></circle>
              <circle
                className="progress-ring-fill"
                cx="60"
                cy="60"
                data-progress={stat.progress}
                r="46"
              ></circle>
            </svg>
            <strong className="stat-value" data-value={stat.value} data-suffix={stat.suffix}>
              0{stat.suffix}
            </strong>
            <span className="stat-label">{stat.label}</span>
          </article>
        ))}
      </section>

      <section className="section-frame" id="customers">
        <div className="section-heading">
          <h2>Built for teams that cannot afford fuzzy ownership.</h2>
        </div>
        <div
          className="testimonial-row"
          onMouseEnter={() => setTestimonialPaused(true)}
          onMouseLeave={() => setTestimonialPaused(false)}
          onPointerDown={handleTestimonialDown}
          onPointerMove={handleTestimonialMove}
          onPointerUp={handleTestimonialUp}
          onPointerCancel={handleTestimonialUp}
          ref={testimonialRef}
        >
          {testimonials.map((testimonial) => (
            <article className="testimonial-card" key={testimonial.name}>
              <p>{testimonial.quote}</p>
              <strong>{testimonial.name}</strong>
              <span>{testimonial.role}</span>
            </article>
          ))}
        </div>
        <div className="testimonial-dots" aria-label="Testimonial slides">
          {testimonials.map((testimonial, index) => (
            <button
              aria-label={`Show testimonial from ${testimonial.name}`}
              aria-pressed={testimonialIndex === index}
              className={testimonialIndex === index ? 'is-active' : ''}
              key={testimonial.name}
              onClick={() => setTestimonialIndex(index)}
              type="button"
            ></button>
          ))}
        </div>
      </section>

      <section className="section-frame" id="pricing">
        <div className="section-heading">
          <h2>Simple plans for serious launch velocity.</h2>
        </div>
        <div className="billing-toggle" aria-label="Billing period">
          <button
            aria-pressed={billingCycle === 'monthly'}
            className={billingCycle === 'monthly' ? 'is-active' : ''}
            onClick={() => setBillingCycle('monthly')}
            type="button"
          >
            Monthly
          </button>
          <button
            aria-pressed={billingCycle === 'yearly'}
            className={billingCycle === 'yearly' ? 'is-active' : ''}
            onClick={() => setBillingCycle('yearly')}
            type="button"
          >
            Yearly
          </button>
        </div>
        <div className="pricing-grid">
          {pricing.map((plan) => (
            <article className={`pricing-card ${plan.popular ? 'is-popular' : ''}`} key={plan.name}>
              {plan.popular && <span className="popular-label">Most popular</span>}
              <h3>{plan.name}</h3>
              <div className="price-line">
                <strong
                  className="price-value"
                  data-monthly={plan.monthly}
                  data-price={billingCycle === 'monthly' ? plan.monthly : plan.yearly}
                  data-yearly={plan.yearly}
                >
                  ${billingCycle === 'monthly' ? plan.monthly : plan.yearly}
                </strong>
                <span>/mo</span>
              </div>
              <p>{plan.description}</p>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <CheckCircle2 size={17} aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <a className={`button ${plan.popular ? 'button-primary' : 'button-ghost'}`} href="#top">
                Choose {plan.name}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="section-frame faq-section">
        <div className="section-heading">
          <h2>Questions before the first launch room?</h2>
        </div>
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <article className={`faq-item ${activeFaq === index ? 'is-open' : ''}`} key={faq.question}>
              <button
                aria-expanded={activeFaq === index}
                className="faq-question"
                onClick={() => setActiveFaq(activeFaq === index ? -1 : index)}
                type="button"
              >
                <span>{faq.question}</span>
                <ChevronDown size={22} aria-hidden="true" />
              </button>
              <div className="faq-answer">
                <p>{faq.answer}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="final-cta section-frame">
        <h2>Give every launch one calm source of truth.</h2>
        <p>
          Start with a single launch room, connect your existing stack, and watch risk turn into
          visible next steps before the next weekly review.
        </p>
        <a className="button button-primary pulse-button" href="#pricing">
          Start free
          <ArrowRight size={18} aria-hidden="true" />
        </a>
      </section>

      <footer className="footer-section section-frame">
        <div>
          <a className="brand footer-brand" href="#top" aria-label="NovaDesk home">
            <span className="brand-mark">N</span>
            NovaDesk
          </a>
          <p>Revenue-critical launch work, organized for teams that move fast.</p>
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

      <a
        className={`sticky-cta ${stickyVisible ? 'is-visible' : ''} ${
          stickyCompact ? 'is-compact' : ''
        }`}
        href="#pricing"
      >
        <span className="sticky-cta-full">Start your launch room</span>
        <span className="sticky-cta-short">Start</span>
        <ArrowRight size={18} aria-hidden="true" />
      </a>
    </main>
  )
}

export default App
