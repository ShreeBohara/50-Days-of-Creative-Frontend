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

function App() {
  return (
    <main className="app-shell">
      <nav className="site-nav" aria-label="Primary navigation">
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

      <section className="hero-section section-frame" id="top">
        <div className="hero-copy">
          <h1>Run every SaaS launch from one live command center.</h1>
          <p>
            NovaDesk helps customer-led teams prioritize risk, automate handoffs, and keep
            leadership aligned without another status meeting.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#pricing">
              Start free
            </a>
            <a className="button button-ghost" href="#workflow">
              See workflow
            </a>
          </div>
        </div>
        <div className="product-mockup" aria-label="NovaDesk product preview">
          <div className="mockup-panel">
            <span>Launch health</span>
            <strong>92%</strong>
          </div>
          <div className="mockup-list">
            <span>Risk signals</span>
            <span>Owner handoffs</span>
            <span>Exec summary</span>
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
