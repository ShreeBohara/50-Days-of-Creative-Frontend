import {
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  ImageUp,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react'
import './App.css'

const steps = [
  {
    id: 'personal',
    label: 'Personal',
    title: 'Tell us who is joining.',
    description: 'Start with the contact details we will use for your onboarding profile.',
    icon: UserRound,
  },
  {
    id: 'preferences',
    label: 'Preferences',
    title: 'Shape the workspace.',
    description: 'Pick the interests and interface mood that should guide the experience.',
    icon: SlidersHorizontal,
  },
  {
    id: 'profile',
    label: 'Photo',
    title: 'Add a profile image.',
    description: 'Drop in a picture and preview how it will appear in the onboarding card.',
    icon: ImageUp,
  },
  {
    id: 'plan',
    label: 'Plan',
    title: 'Choose your launch plan.',
    description: 'Compare the options and select the plan that fits the next sprint.',
    icon: CreditCard,
  },
  {
    id: 'review',
    label: 'Review',
    title: 'Confirm the setup.',
    description: 'Review every section before sending the onboarding request.',
    icon: ClipboardCheck,
  },
]

function StepOverview() {
  return (
    <ol className="step-list" aria-label="Wizard steps">
      {steps.map((step, index) => {
        const Icon = step.icon
        const isActive = index === 0

        return (
          <li className={isActive ? 'is-active' : ''} key={step.id}>
            <span className="step-marker" aria-hidden="true">
              {isActive ? <CheckCircle2 size={18} /> : <Icon size={18} />}
            </span>
            <span>
              <strong>{step.label}</strong>
              <small>{step.title}</small>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function App() {
  return (
    <main className="wizard-app">
      <section className="intro-panel" aria-labelledby="app-title">
        <p className="day-label">Day 29</p>
        <h1 id="app-title">Animated Multi-Step Form Wizard</h1>
        <p className="intro-copy">
          A crisp onboarding flow with progressive disclosure, validation, motion, and a
          final celebration when every detail is ready.
        </p>
        <StepOverview />
      </section>

      <section className="wizard-panel" aria-label="Onboarding form">
        <div className="wizard-card">
          <div className="wizard-card__header">
            <span className="step-count">Step 1 of {steps.length}</span>
            <h2>{steps[0].title}</h2>
            <p>{steps[0].description}</p>
          </div>

          <div className="placeholder-step">
            <UserRound size={32} aria-hidden="true" />
            <p>Form state and fields land in the next commits.</p>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
