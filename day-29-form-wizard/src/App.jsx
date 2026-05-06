import { useState } from 'react'
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

const initialForm = {
  name: '',
  email: '',
  phone: '',
  interests: [],
  theme: 'light',
  avatar: null,
  plan: 'pro',
}

function FloatingField({ id, label, type = 'text', value, onChange, autoComplete }) {
  return (
    <div className="floating-field">
      <input
        id={id}
        type={type}
        value={value}
        placeholder=" "
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
      />
      <label htmlFor={id}>{label}</label>
    </div>
  )
}

function PersonalStep({ data, onUpdate }) {
  return (
    <div className="step-body">
      <div className="form-grid">
        <FloatingField
          id="name"
          label="Full name"
          value={data.name}
          autoComplete="name"
          onChange={(value) => onUpdate('name', value)}
        />
        <FloatingField
          id="email"
          label="Email address"
          type="email"
          value={data.email}
          autoComplete="email"
          onChange={(value) => onUpdate('email', value)}
        />
        <FloatingField
          id="phone"
          label="Phone number"
          type="tel"
          value={data.phone}
          autoComplete="tel"
          onChange={(value) => onUpdate('phone', value)}
        />
      </div>
    </div>
  )
}

function StepContent({ stepId, data, onUpdate }) {
  if (stepId === 'personal') {
    return <PersonalStep data={data} onUpdate={onUpdate} />
  }

  return (
    <div className="placeholder-step">
      <p>{stepId} controls land in the next commits.</p>
    </div>
  )
}

function StepOverview({ currentIndex, onStepSelect }) {
  return (
    <ol className="step-list" aria-label="Wizard steps">
      {steps.map((step, index) => {
        const Icon = step.icon
        const isActive = index === currentIndex
        const isComplete = index < currentIndex

        return (
          <li
            className={`${isActive ? 'is-active' : ''} ${isComplete ? 'is-complete' : ''}`}
            key={step.id}
          >
            <button
              type="button"
              className="step-button"
              aria-current={isActive ? 'step' : undefined}
              onClick={() => onStepSelect(index)}
            >
              <span className="step-marker" aria-hidden="true">
                {isComplete ? <CheckCircle2 size={18} /> : <Icon size={18} />}
              </span>
              <span>
                <strong>{step.label}</strong>
                <small>{step.title}</small>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function App() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [formData, setFormData] = useState(initialForm)

  const currentStep = steps[currentIndex]
  const isFirstStep = currentIndex === 0
  const isLastStep = currentIndex === steps.length - 1

  const updateField = (field, value) => {
    setFormData((data) => ({
      ...data,
      [field]: value,
    }))
  }

  const goToStep = (nextIndex) => {
    if (nextIndex === currentIndex || nextIndex < 0 || nextIndex >= steps.length) {
      return
    }

    setDirection(nextIndex > currentIndex ? 1 : -1)
    setCurrentIndex(nextIndex)
  }

  const goBack = () => {
    goToStep(currentIndex - 1)
  }

  const goNext = () => {
    goToStep(currentIndex + 1)
  }

  return (
    <main className="wizard-app">
      <section className="intro-panel" aria-labelledby="app-title">
        <p className="day-label">Day 29</p>
        <h1 id="app-title">Animated Multi-Step Form Wizard</h1>
        <p className="intro-copy">
          A crisp onboarding flow with progressive disclosure, validation, motion, and a
          final celebration when every detail is ready.
        </p>
        <StepOverview currentIndex={currentIndex} onStepSelect={goToStep} />
      </section>

      <section className="wizard-panel" aria-label="Onboarding form">
        <div className="wizard-card">
          <div className="wizard-card__header">
            <span className="step-count">
              Step {currentIndex + 1} of {steps.length}
            </span>
            <h2>{currentStep.title}</h2>
            <p>{currentStep.description}</p>
          </div>

          <div className="step-frame" data-direction={direction}>
            <StepContent stepId={currentStep.id} data={formData} onUpdate={updateField} />
          </div>

          <div className="wizard-actions">
            <button type="button" className="secondary-button" onClick={goBack} disabled={isFirstStep}>
              Back
            </button>
            <button type="button" className="primary-button" onClick={goNext} disabled={isLastStep}>
              Continue
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
