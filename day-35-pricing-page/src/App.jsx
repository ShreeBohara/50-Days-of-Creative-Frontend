import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  Check,
  Layers3,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import { pricingPlans } from './content'
import './App.css'

gsap.registerPlugin(Flip)

const formatUsd = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

const getPlanPrice = (plan, billingCycle) =>
  billingCycle === 'yearly' ? Math.round(plan.monthly * 0.8) : plan.monthly

function PriceRoller({ value }) {
  const amountRef = useRef(null)
  const previousValue = useRef(value)

  useEffect(() => {
    const node = amountRef.current
    if (!node) {
      return undefined
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const counter = { value: previousValue.current }
    const tween = gsap.to(counter, {
      value,
      duration: reduceMotion ? 0 : 0.58,
      ease: 'power3.out',
      onUpdate: () => {
        node.textContent = formatUsd(counter.value)
      },
    })
    const lift = gsap.fromTo(
      node,
      { y: reduceMotion ? 0 : 16, opacity: reduceMotion ? 1 : 0.35 },
      { y: 0, opacity: 1, duration: reduceMotion ? 0 : 0.42, ease: 'power3.out' },
    )

    previousValue.current = value

    return () => {
      tween.kill()
      lift.kill()
    }
  }, [value])

  return (
    <span ref={amountRef} className="digit-roller">
      {formatUsd(value)}
    </span>
  )
}

function BillingConsoleVisual() {
  return (
    <div className="console-visual" aria-label="HelioStack billing console preview">
      <div className="console-topbar">
        <span className="console-dot"></span>
        <span className="console-dot"></span>
        <span className="console-dot"></span>
        <strong>Revenue cockpit</strong>
      </div>
      <div className="console-body">
        <div className="console-stat">
          <span>Projected ARR</span>
          <strong>$1.8M</strong>
          <small>+18.4% this cycle</small>
        </div>
        <div className="console-chart" aria-hidden="true">
          <span style={{ '--bar': '38%' }}></span>
          <span style={{ '--bar': '52%' }}></span>
          <span style={{ '--bar': '44%' }}></span>
          <span style={{ '--bar': '70%' }}></span>
          <span style={{ '--bar': '62%' }}></span>
          <span style={{ '--bar': '86%' }}></span>
        </div>
        <div className="console-list">
          <div>
            <span>Annual plan optimization</span>
            <strong>Live</strong>
          </div>
          <div>
            <span>Seat expansion forecast</span>
            <strong>Ready</strong>
          </div>
          <div>
            <span>Net revenue guardrails</span>
            <strong>Synced</strong>
          </div>
        </div>
      </div>
    </div>
  )
}

function BillingToggle({ billingCycle, onChange }) {
  const isYearly = billingCycle === 'yearly'

  return (
    <div className="billing-controls" aria-label="Billing frequency">
      <div className="billing-toggle" role="group" aria-label="Choose billing cycle">
        <span className={`toggle-thumb ${isYearly ? 'is-yearly' : ''}`} aria-hidden="true"></span>
        <button
          type="button"
          aria-pressed={!isYearly}
          className={!isYearly ? 'is-active' : ''}
          onClick={() => onChange('monthly')}
        >
          Monthly
        </button>
        <button
          type="button"
          aria-pressed={isYearly}
          className={isYearly ? 'is-active' : ''}
          onClick={() => onChange('yearly')}
        >
          Yearly
        </button>
      </div>
      {isYearly && <span className="save-badge">Save 20%</span>}
    </div>
  )
}

function PricingCard({ plan, billingCycle }) {
  const price = getPlanPrice(plan, billingCycle)

  return (
    <article className={`pricing-card ${plan.featured ? 'is-featured' : ''}`}>
      <div className="card-topline">
        <div className="card-kicker">{plan.tone}</div>
        {plan.featured && (
          <div className="popular-badge">
            <Sparkles size={14} aria-hidden="true" />
            Most Popular
          </div>
        )}
      </div>
      <div className="card-heading">
        <h3>{plan.name}</h3>
        <p>{plan.summary}</p>
      </div>
      <div className="price-row">
        <strong>
          <PriceRoller value={price} />
        </strong>
        <span>/mo</span>
      </div>
      <p className="billing-note">
        {billingCycle === 'yearly' ? 'Billed yearly with annual savings applied.' : 'Billed monthly. Change or cancel anytime.'}
      </p>
      <ul className="feature-list" aria-label={`${plan.name} features`}>
        {plan.features.map((feature) => (
          <li key={feature.label} className={feature.included ? 'is-included' : 'is-excluded'}>
            <span className="feature-icon" aria-hidden="true">
              {feature.included ? <Check size={16} /> : <X size={16} />}
            </span>
            {feature.label}
          </li>
        ))}
      </ul>
      <button className="plan-cta" type="button">
        {plan.cta}
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </article>
  )
}

function App() {
  const [billingCycle, setBillingCycle] = useState('monthly')
  const pricingGridRef = useRef(null)
  const orderedPlanIds =
    billingCycle === 'yearly' ? ['pro', 'starter', 'enterprise'] : ['starter', 'pro', 'enterprise']
  const orderedPlans = orderedPlanIds.map((id) => pricingPlans.find((plan) => plan.id === id))

  const handleBillingChange = (nextCycle) => {
    if (nextCycle === billingCycle) {
      return
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const cards = pricingGridRef.current?.querySelectorAll('.pricing-card')
    const flipState = cards?.length && !reduceMotion ? Flip.getState(cards) : null

    setBillingCycle(nextCycle)

    if (flipState) {
      requestAnimationFrame(() => {
        Flip.from(flipState, {
          duration: 0.72,
          ease: 'power3.inOut',
          absolute: true,
          nested: true,
          stagger: 0.04,
        })
      })
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header" aria-label="HelioStack navigation">
        <a className="brand" href="#top" aria-label="HelioStack home">
          <span className="brand-mark">
            <Sparkles size={18} aria-hidden="true" />
          </span>
          HelioStack
        </a>
        <nav className="nav-links" aria-label="Page sections">
          <a href="#pricing">Plans</a>
          <a href="#addons">Add-ons</a>
          <a href="#compare">Compare</a>
          <a href="#faq">FAQ</a>
        </nav>
        <a className="header-cta" href="#pricing">
          Choose plan
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      </header>

      <main id="top">
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="hero-label">Day 35 pricing lab</p>
            <h1 id="hero-title">Pricing that moves as smoothly as your product.</h1>
            <p className="hero-text">
              HelioStack gives revenue teams a clean billing workspace with plans, add-ons,
              forecasting, and plan-change clarity in one polished flow.
            </p>
            <div className="hero-actions">
              <a className="primary-button" href="#pricing">
                Explore plans
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a className="secondary-button" href="#compare">
                Compare features
              </a>
            </div>
          </div>
          <BillingConsoleVisual />
        </section>

        <section className="trust-strip" aria-label="Pricing principles">
          <div>
            <BarChart3 size={20} aria-hidden="true" />
            <span>Forecast-ready totals</span>
          </div>
          <div>
            <Layers3 size={20} aria-hidden="true" />
            <span>Modular add-ons</span>
          </div>
          <div>
            <ShieldCheck size={20} aria-hidden="true" />
            <span>Enterprise guardrails</span>
          </div>
        </section>

        <section id="pricing" className="page-section pricing-section" aria-labelledby="pricing-title">
          <div className="section-heading">
            <span>Plans</span>
            <h2 id="pricing-title">Pick the plan that fits your growth curve.</h2>
          </div>
          <BillingToggle billingCycle={billingCycle} onChange={handleBillingChange} />
          <div ref={pricingGridRef} className="pricing-grid">
            {orderedPlans.map((plan) => (
              <PricingCard key={plan.id} plan={plan} billingCycle={billingCycle} />
            ))}
          </div>
        </section>

        <section id="addons" className="page-section addons-section" aria-labelledby="addons-title">
          <div className="section-heading">
            <span>Add-ons</span>
            <h2 id="addons-title">Extend the workspace when your team needs more power.</h2>
          </div>
          <div className="surface-placeholder"></div>
        </section>

        <section id="compare" className="page-section compare-section" aria-labelledby="compare-title">
          <div className="section-heading">
            <span>Comparison</span>
            <h2 id="compare-title">Clear differences without a maze of footnotes.</h2>
          </div>
          <div className="surface-placeholder"></div>
        </section>

        <section id="faq" className="page-section faq-section" aria-labelledby="faq-title">
          <div className="section-heading">
            <span>FAQ</span>
            <h2 id="faq-title">Short answers for plan changes, currencies, and billing cycles.</h2>
          </div>
          <div className="surface-placeholder"></div>
        </section>
      </main>
    </div>
  )
}

export default App
