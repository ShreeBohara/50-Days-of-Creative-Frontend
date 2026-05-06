import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  ImageUp,
  Moon,
  Pencil,
  Sparkles,
  SlidersHorizontal,
  SunMedium,
  UploadCloud,
  X,
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

const interestOptions = [
  'Product design',
  'Motion systems',
  'Analytics',
  'Automation',
  'Frontend craft',
  'Launch planning',
]

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$19',
    description: 'For a focused solo launch.',
    features: ['Profile setup', '3 project spaces', 'Email support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$49',
    description: 'For teams moving quickly.',
    features: ['Everything in Starter', 'Unlimited spaces', 'Priority onboarding'],
  },
  {
    id: 'studio',
    name: 'Studio',
    price: '$99',
    description: 'For advanced collaboration.',
    features: ['Everything in Pro', 'Custom templates', 'Dedicated success review'],
  },
]

const stepVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 36 : -36,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? -36 : 36,
    opacity: 0,
  }),
}

const stepFieldMap = {
  personal: ['name', 'email', 'phone'],
  preferences: ['interests'],
  profile: [],
  plan: ['plan'],
  review: [],
}

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

const validateForm = (data) => {
  const nextErrors = {}

  if (data.name.trim().length < 2) {
    nextErrors.name = 'Enter at least 2 characters.'
  }

  if (!validateEmail(data.email)) {
    nextErrors.email = 'Enter a valid email address.'
  }

  const digits = data.phone.replace(/\D/g, '')
  if (digits.length < 10) {
    nextErrors.phone = 'Enter a phone number with at least 10 digits.'
  }

  if (data.interests.length === 0) {
    nextErrors.interests = 'Select at least one interest.'
  }

  if (!data.plan) {
    nextErrors.plan = 'Choose a plan before continuing.'
  }

  return nextErrors
}

const pickStepErrors = (stepId, allErrors) => {
  const fields = stepFieldMap[stepId] ?? []

  return fields.reduce((stepErrors, field) => {
    if (allErrors[field]) {
      stepErrors[field] = allErrors[field]
    }

    return stepErrors
  }, {})
}

const hasErrors = (errors) => Object.keys(errors).length > 0

function FloatingField({
  id,
  label,
  type = 'text',
  value,
  error,
  onBlur,
  onChange,
  autoComplete,
}) {
  const errorId = `${id}-error`

  return (
    <div className={`floating-field ${error ? 'has-error' : ''}`}>
      <input
        id={id}
        type={type}
        value={value}
        placeholder=" "
        autoComplete={autoComplete}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      <label htmlFor={id}>{label}</label>
      {error ? (
        <motion.p
          className="field-error"
          id={errorId}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle size={15} aria-hidden="true" />
          {error}
        </motion.p>
      ) : null}
    </div>
  )
}

function PersonalStep({ data, errors, onBlur, onUpdate }) {
  return (
    <div className="step-body">
      <div className="form-grid">
        <FloatingField
          id="name"
          label="Full name"
          value={data.name}
          autoComplete="name"
          error={errors.name}
          onBlur={() => onBlur('name')}
          onChange={(value) => onUpdate('name', value)}
        />
        <FloatingField
          id="email"
          label="Email address"
          type="email"
          value={data.email}
          autoComplete="email"
          error={errors.email}
          onBlur={() => onBlur('email')}
          onChange={(value) => onUpdate('email', value)}
        />
        <FloatingField
          id="phone"
          label="Phone number"
          type="tel"
          value={data.phone}
          autoComplete="tel"
          error={errors.phone}
          onBlur={() => onBlur('phone')}
          onChange={(value) => onUpdate('phone', value)}
        />
      </div>
    </div>
  )
}

function PreferencesStep({ data, errors, onUpdate }) {
  const toggleInterest = (interest) => {
    const nextInterests = data.interests.includes(interest)
      ? data.interests.filter((item) => item !== interest)
      : [...data.interests, interest]

    onUpdate('interests', nextInterests)
  }

  return (
    <div className="step-body">
      <fieldset className="choice-group">
        <legend>Choose your interests</legend>
        <div
          className={`chip-grid ${errors.interests ? 'has-error' : ''}`}
          aria-describedby={errors.interests ? 'interests-error' : undefined}
        >
          {interestOptions.map((interest) => {
            const isSelected = data.interests.includes(interest)

            return (
              <button
                type="button"
                className={`interest-chip ${isSelected ? 'is-selected' : ''}`}
                aria-pressed={isSelected}
                key={interest}
                onClick={() => toggleInterest(interest)}
              >
                <Sparkles size={16} aria-hidden="true" />
                {interest}
              </button>
            )
          })}
        </div>
        {errors.interests ? (
          <motion.p
            className="field-error"
            id="interests-error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertCircle size={15} aria-hidden="true" />
            {errors.interests}
          </motion.p>
        ) : null}
      </fieldset>

      <fieldset className="choice-group">
        <legend>Interface theme</legend>
        <div className="theme-toggle" role="group" aria-label="Interface theme">
          <button
            type="button"
            className={data.theme === 'light' ? 'is-selected' : ''}
            aria-pressed={data.theme === 'light'}
            onClick={() => onUpdate('theme', 'light')}
          >
            <SunMedium size={18} aria-hidden="true" />
            Light
          </button>
          <button
            type="button"
            className={data.theme === 'dark' ? 'is-selected' : ''}
            aria-pressed={data.theme === 'dark'}
            onClick={() => onUpdate('theme', 'dark')}
          >
            <Moon size={18} aria-hidden="true" />
            Dark
          </button>
        </div>
      </fieldset>
    </div>
  )
}

function ProfileStep({ data, onUpdate }) {
  const setAvatarFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      return
    }

    if (data.avatar?.url) {
      URL.revokeObjectURL(data.avatar.url)
    }

    onUpdate('avatar', {
      name: file.name,
      url: URL.createObjectURL(file),
    })
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setAvatarFile(event.dataTransfer.files?.[0])
  }

  const clearAvatar = () => {
    if (data.avatar?.url) {
      URL.revokeObjectURL(data.avatar.url)
    }

    onUpdate('avatar', null)
  }

  return (
    <div className="step-body">
      <div
        className={`upload-zone ${data.avatar ? 'has-preview' : ''}`}
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
      >
        <input
          id="avatar-upload"
          className="visually-hidden"
          type="file"
          accept="image/*"
          onChange={(event) => setAvatarFile(event.target.files?.[0])}
        />

        {data.avatar ? (
          <div className="avatar-preview">
            <img src={data.avatar.url} alt="Selected profile preview" />
            <span className="crop-ring" aria-hidden="true" />
            <button type="button" className="remove-avatar" onClick={clearAvatar}>
              <X size={16} aria-hidden="true" />
              Remove
            </button>
          </div>
        ) : (
          <div className="upload-empty">
            <span className="upload-icon" aria-hidden="true">
              <UploadCloud size={28} />
            </span>
            <strong>Drop a profile image here</strong>
            <p>Use a square portrait for the cleanest circular crop.</p>
          </div>
        )}

        <label className="upload-button" htmlFor="avatar-upload">
          <Camera size={18} aria-hidden="true" />
          {data.avatar ? 'Choose a different image' : 'Browse files'}
        </label>
      </div>
    </div>
  )
}

function PlanStep({ data, errors, onUpdate }) {
  return (
    <div className="step-body">
      <div
        className={`plan-grid ${errors.plan ? 'has-error' : ''}`}
        role="radiogroup"
        aria-label="Plan selection"
        aria-describedby={errors.plan ? 'plan-error' : undefined}
      >
        {plans.map((plan) => {
          const isSelected = data.plan === plan.id

          return (
            <button
              type="button"
              className={`plan-card ${isSelected ? 'is-selected' : ''}`}
              role="radio"
              aria-checked={isSelected}
              key={plan.id}
              onClick={() => onUpdate('plan', plan.id)}
            >
              <span className="plan-radio" aria-hidden="true" />
              <span className="plan-name">{plan.name}</span>
              <span className="plan-price">{plan.price}</span>
              <span className="plan-description">{plan.description}</span>
              <span className="feature-list">
                {plan.features.map((feature) => (
                  <span key={feature}>
                    <CheckCircle2 size={15} aria-hidden="true" />
                    {feature}
                  </span>
                ))}
              </span>
            </button>
          )
        })}
      </div>
      {errors.plan ? (
        <motion.p
          className="field-error"
          id="plan-error"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle size={15} aria-hidden="true" />
          {errors.plan}
        </motion.p>
      ) : null}
    </div>
  )
}

function ReviewStep({ data, onEdit }) {
  const selectedPlan = plans.find((plan) => plan.id === data.plan)
  const summarySections = [
    {
      title: 'Personal info',
      stepIndex: 0,
      rows: [
        ['Name', data.name || 'Not provided'],
        ['Email', data.email || 'Not provided'],
        ['Phone', data.phone || 'Not provided'],
      ],
    },
    {
      title: 'Preferences',
      stepIndex: 1,
      rows: [
        ['Interests', data.interests.length ? data.interests.join(', ') : 'None selected'],
        ['Theme', data.theme === 'light' ? 'Light interface' : 'Dark interface'],
      ],
    },
    {
      title: 'Profile photo',
      stepIndex: 2,
      rows: [['Image', data.avatar?.name || 'No image uploaded']],
    },
    {
      title: 'Plan',
      stepIndex: 3,
      rows: [
        ['Selected plan', selectedPlan?.name || 'Not selected'],
        ['Monthly price', selectedPlan?.price || ''],
      ],
    },
  ]

  return (
    <div className="review-grid">
      {summarySections.map((section) => (
        <article className="review-card" key={section.title}>
          <div className="review-card__head">
            <h3>{section.title}</h3>
            <button type="button" onClick={() => onEdit(section.stepIndex)}>
              <Pencil size={15} aria-hidden="true" />
              Edit
            </button>
          </div>
          <dl>
            {section.rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </article>
      ))}
    </div>
  )
}

function ProgressBar({ currentIndex }) {
  return (
    <div className="progress-wrap" aria-label={`Step ${currentIndex + 1} of ${steps.length}`}>
      {steps.map((step, index) => (
        <span
          className={`${index < currentIndex ? 'is-complete' : ''} ${
            index === currentIndex ? 'is-active' : ''
          }`}
          key={step.id}
        />
      ))}
    </div>
  )
}

function StepContent({ stepId, data, errors, onBlur, onUpdate, onEdit }) {
  if (stepId === 'personal') {
    return <PersonalStep data={data} errors={errors} onBlur={onBlur} onUpdate={onUpdate} />
  }

  if (stepId === 'preferences') {
    return <PreferencesStep data={data} errors={errors} onUpdate={onUpdate} />
  }

  if (stepId === 'profile') {
    return <ProfileStep data={data} onUpdate={onUpdate} />
  }

  if (stepId === 'plan') {
    return <PlanStep data={data} errors={errors} onUpdate={onUpdate} />
  }

  if (stepId === 'review') {
    return <ReviewStep data={data} onEdit={onEdit} />
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
                {isComplete ? (
                  <motion.span
                    initial={{ scale: 0.6, rotate: -18 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                  >
                    <CheckCircle2 size={18} />
                  </motion.span>
                ) : (
                  <Icon size={18} />
                )}
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
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const currentStep = steps[currentIndex]
  const isFirstStep = currentIndex === 0
  const isLastStep = currentIndex === steps.length - 1

  const updateField = (field, value) => {
    const nextData = {
      ...formData,
      [field]: value,
    }
    setFormData(nextData)

    if (touched[field] || errors[field]) {
      const nextErrors = validateForm(nextData)
      setErrors((currentErrors) => {
        const mergedErrors = { ...currentErrors }

        if (nextErrors[field]) {
          mergedErrors[field] = nextErrors[field]
        } else {
          delete mergedErrors[field]
        }

        return mergedErrors
      })
    }
  }

  const markTouched = (field) => {
    setTouched((currentTouched) => ({
      ...currentTouched,
      [field]: true,
    }))

    const fieldError = validateForm(formData)[field]
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }

      if (fieldError) {
        nextErrors[field] = fieldError
      } else {
        delete nextErrors[field]
      }

      return nextErrors
    })
  }

  const validateCurrentStep = () => {
    const nextErrors = validateForm(formData)
    const stepErrors = pickStepErrors(currentStep.id, nextErrors)
    const stepFields = stepFieldMap[currentStep.id] ?? []

    setTouched((currentTouched) => ({
      ...currentTouched,
      ...stepFields.reduce((nextTouched, field) => ({ ...nextTouched, [field]: true }), {}),
    }))

    setErrors((currentErrors) => {
      const mergedErrors = { ...currentErrors }
      stepFields.forEach((field) => {
        delete mergedErrors[field]
      })

      return {
        ...mergedErrors,
        ...stepErrors,
      }
    })

    return !hasErrors(stepErrors)
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
    if (validateCurrentStep()) {
      goToStep(currentIndex + 1)
    }
  }

  const handleStepSelect = (nextIndex) => {
    if (nextIndex > currentIndex && !validateCurrentStep()) {
      return
    }

    goToStep(nextIndex)
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
        <StepOverview currentIndex={currentIndex} onStepSelect={handleStepSelect} />
      </section>

      <section className="wizard-panel" aria-label="Onboarding form">
        <div className="wizard-card">
          <ProgressBar currentIndex={currentIndex} />
          <div className="wizard-card__header">
            <span className="step-count">
              Step {currentIndex + 1} of {steps.length}
            </span>
            <h2>{currentStep.title}</h2>
            <p>{currentStep.description}</p>
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              className="step-frame"
              key={currentStep.id}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              <StepContent
                stepId={currentStep.id}
                data={formData}
                errors={errors}
                onBlur={markTouched}
                onUpdate={updateField}
                onEdit={goToStep}
              />
            </motion.div>
          </AnimatePresence>

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
