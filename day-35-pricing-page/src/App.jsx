import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Layers3,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { addOns, comparisonRows, faqItems, getAddonPrice, pricingPlans } from './content'
import './App.css'

gsap.registerPlugin(Flip, ScrollTrigger)

const currencyRates = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.78,
}

const currencyNames = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
}

const formatConvertedCurrency = (value, currency) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)

const convertCurrency = (value, currency) => value * currencyRates[currency]

const formatCurrency = (value, currency) =>
  formatConvertedCurrency(convertCurrency(value, currency), currency)

const getPlanPrice = (plan, billingCycle) =>
  billingCycle === 'yearly' ? Math.round(plan.monthly * 0.8) : plan.monthly

function PriceRoller({ value, currency }) {
  const amountRef = useRef(null)
  const previousValue = useRef(convertCurrency(value, currency))

  useEffect(() => {
    const node = amountRef.current
    if (!node) {
      return undefined
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const displayValue = convertCurrency(value, currency)
    const counter = { value: previousValue.current }
    const tween = gsap.to(counter, {
      value: displayValue,
      duration: reduceMotion ? 0 : 0.58,
      ease: 'power3.out',
      onUpdate: () => {
        node.textContent = formatConvertedCurrency(counter.value, currency)
      },
    })
    const lift = gsap.fromTo(
      node,
      { y: reduceMotion ? 0 : 16, opacity: reduceMotion ? 1 : 0.35 },
      { y: 0, opacity: 1, duration: reduceMotion ? 0 : 0.42, ease: 'power3.out' },
    )

    previousValue.current = displayValue

    return () => {
      tween.kill()
      lift.kill()
    }
  }, [currency, value])

  return (
    <span ref={amountRef} className="digit-roller">
      {formatCurrency(value, currency)}
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

function CurrencySelector({ currency, onChange }) {
  return (
    <label className="currency-selector" htmlFor="currency">
      <span>Currency</span>
      <select id="currency" value={currency} onChange={(event) => onChange(event.target.value)}>
        {Object.keys(currencyRates).map((code) => (
          <option value={code} key={code}>
            {code} - {currencyNames[code]}
          </option>
        ))}
      </select>
    </label>
  )
}

function PricingCard({ plan, billingCycle, currency, isSelected, onSelectPlan }) {
  const price = getPlanPrice(plan, billingCycle)

  return (
    <article className={`pricing-card ${plan.featured ? 'is-featured' : ''} ${isSelected ? 'is-selected' : ''}`}>
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
          <PriceRoller value={price} currency={currency} />
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
      <button className="plan-cta" type="button" aria-pressed={isSelected} onClick={() => onSelectPlan(plan.id)}>
        {isSelected ? 'Selected plan' : plan.cta}
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </article>
  )
}

function AddOnsPanel({ billingCycle, currency, selectedPlan, selectedAddons, onToggleAddon }) {
  const selectedAddonItems = addOns.filter((addon) => selectedAddons.includes(addon.id))
  const planTotal = getPlanPrice(selectedPlan, billingCycle)
  const addonTotal = selectedAddonItems.reduce(
    (sum, addon) => sum + getAddonPrice(addon, billingCycle),
    0,
  )
  const total = planTotal + addonTotal

  return (
    <div className="addons-layout">
      <div className="addons-grid">
        {addOns.map((addon) => {
          const isChecked = selectedAddons.includes(addon.id)
          const inputId = `addon-${addon.id}`

          return (
            <label className={`addon-card ${isChecked ? 'is-active' : ''}`} htmlFor={inputId} key={addon.id}>
              <input
                id={inputId}
                type="checkbox"
                checked={isChecked}
                onChange={() => onToggleAddon(addon.id)}
              />
              <span className="addon-toggle" aria-hidden="true"></span>
              <span className="addon-copy">
                <strong>{addon.name}</strong>
                <span>{addon.summary}</span>
              </span>
              <span className="addon-price">
                {formatCurrency(getAddonPrice(addon, billingCycle), currency)}
                <small>/mo</small>
              </span>
            </label>
          )
        })}
      </div>

      <aside className="total-card" aria-label="Selected plan total">
        <span>Total for {selectedPlan.name}</span>
        <strong>
          <PriceRoller value={total} currency={currency} />
        </strong>
        <p>
          {selectedAddonItems.length
            ? `${selectedAddonItems.length} add-on${selectedAddonItems.length > 1 ? 's' : ''} included.`
            : 'No add-ons selected yet.'}
        </p>
      </aside>
    </div>
  )
}

function MatrixValue({ value }) {
  if (typeof value === 'boolean') {
    return (
      <span className={`matrix-icon ${value ? 'matrix-check' : 'matrix-x'}`} aria-label={value ? 'Included' : 'Not included'}>
        {value ? <Check size={17} aria-hidden="true" /> : <X size={17} aria-hidden="true" />}
      </span>
    )
  }

  return <span className="matrix-text">{value}</span>
}

function ComparisonMatrix() {
  const matrixRef = useRef(null)

  useEffect(() => {
    const node = matrixRef.current
    if (!node) {
      return undefined
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      return undefined
    }

    const ctx = gsap.context(() => {
      gsap.from('.matrix-row', {
        y: 28,
        opacity: 0,
        duration: 0.58,
        ease: 'power3.out',
        stagger: 0.08,
        scrollTrigger: {
          trigger: node,
          start: 'top 78%',
        },
      })

      gsap.from('.matrix-check', {
        scale: 0,
        opacity: 0,
        duration: 0.38,
        ease: 'back.out(1.8)',
        stagger: 0.04,
        scrollTrigger: {
          trigger: node,
          start: 'top 72%',
        },
      })
    }, node)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={matrixRef} className="comparison-shell">
      <div className="comparison-grid" role="table" aria-label="Feature comparison by plan">
        <div className="matrix-head matrix-feature" role="columnheader">
          Feature
        </div>
        <div className="matrix-head" role="columnheader">
          Starter
        </div>
        <div className="matrix-head" role="columnheader">
          Pro
        </div>
        <div className="matrix-head" role="columnheader">
          Enterprise
        </div>
        {comparisonRows.map((row) => (
          <div className="matrix-row" role="row" key={row.feature}>
            <div className="matrix-feature" role="cell">
              {row.feature}
            </div>
            <div role="cell">
              <MatrixValue value={row.starter} />
            </div>
            <div role="cell">
              <MatrixValue value={row.pro} />
            </div>
            <div role="cell">
              <MatrixValue value={row.enterprise} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FaqAccordion({ activeFaq, onChange }) {
  const faqRef = useRef(null)

  useEffect(() => {
    const node = faqRef.current
    if (!node) {
      return undefined
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const panels = node.querySelectorAll('.faq-panel')
    const tweens = Array.from(panels).map((panel, index) =>
      gsap.to(panel, {
        height: index === activeFaq ? panel.scrollHeight : 0,
        duration: reduceMotion ? 0 : 0.34,
        ease: 'power2.out',
      }),
    )

    return () => tweens.forEach((tween) => tween.kill())
  }, [activeFaq])

  return (
    <div ref={faqRef} className="faq-list">
      {faqItems.map((item, index) => {
        const isOpen = index === activeFaq
        const panelId = `faq-panel-${index}`

        return (
          <article className={`faq-item ${isOpen ? 'is-open' : ''}`} key={item.question}>
            <button
              type="button"
              className="faq-question"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => onChange(isOpen ? -1 : index)}
            >
              <span>{item.question}</span>
              <ChevronDown size={20} aria-hidden="true" />
            </button>
            <div id={panelId} className="faq-panel" aria-hidden={!isOpen}>
              <p>{item.answer}</p>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function App() {
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [currency, setCurrency] = useState('USD')
  const [selectedPlan, setSelectedPlan] = useState('pro')
  const [selectedAddons, setSelectedAddons] = useState(['forecast'])
  const [activeFaq, setActiveFaq] = useState(0)
  const pricingGridRef = useRef(null)
  const orderedPlanIds =
    billingCycle === 'yearly' ? ['pro', 'starter', 'enterprise'] : ['starter', 'pro', 'enterprise']
  const orderedPlans = orderedPlanIds.map((id) => pricingPlans.find((plan) => plan.id === id))
  const activePlan = pricingPlans.find((plan) => plan.id === selectedPlan)

  const handleAddonToggle = (addonId) => {
    setSelectedAddons((current) =>
      current.includes(addonId) ? current.filter((id) => id !== addonId) : [...current, addonId],
    )
  }

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
          <div className="pricing-toolbar">
            <BillingToggle billingCycle={billingCycle} onChange={handleBillingChange} />
            <CurrencySelector currency={currency} onChange={setCurrency} />
          </div>
          <div ref={pricingGridRef} className="pricing-grid">
            {orderedPlans.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                billingCycle={billingCycle}
                currency={currency}
                isSelected={plan.id === selectedPlan}
                onSelectPlan={setSelectedPlan}
              />
            ))}
          </div>
        </section>

        <section id="addons" className="page-section addons-section" aria-labelledby="addons-title">
          <div className="section-heading">
            <span>Add-ons</span>
            <h2 id="addons-title">Extend the workspace when your team needs more power.</h2>
          </div>
          <AddOnsPanel
            billingCycle={billingCycle}
            currency={currency}
            selectedPlan={activePlan}
            selectedAddons={selectedAddons}
            onToggleAddon={handleAddonToggle}
          />
        </section>

        <section id="compare" className="page-section compare-section" aria-labelledby="compare-title">
          <div className="section-heading">
            <span>Comparison</span>
            <h2 id="compare-title">Clear differences without a maze of footnotes.</h2>
          </div>
          <ComparisonMatrix />
        </section>

        <section id="faq" className="page-section faq-section" aria-labelledby="faq-title">
          <div className="section-heading">
            <span>FAQ</span>
            <h2 id="faq-title">Short answers for plan changes, currencies, and billing cycles.</h2>
          </div>
          <FaqAccordion activeFaq={activeFaq} onChange={setActiveFaq} />
        </section>
      </main>
    </div>
  )
}

export default App
