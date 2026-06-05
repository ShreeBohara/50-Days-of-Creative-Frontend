export const pricingPlans = [
  {
    id: 'starter',
    name: 'Starter',
    summary: 'For founders validating billing motion without spreadsheet drift.',
    monthly: 29,
    cta: 'Start lean',
    tone: 'Quiet launch plan',
    features: [
      { label: 'Revenue command center', included: true },
      { label: 'Monthly plan experiments', included: true },
      { label: 'Up to 3 teammate seats', included: true },
      { label: 'Basic usage alerts', included: true },
      { label: 'Self-serve invoice history', included: true },
      { label: 'Forecast snapshots', included: false },
      { label: 'Approval workflows', included: false },
      { label: 'Dedicated success desk', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    summary: 'For growing teams that need clean pricing experiments and forecasting.',
    monthly: 79,
    cta: 'Choose Pro',
    tone: 'Most teams land here',
    featured: true,
    features: [
      { label: 'Revenue command center', included: true },
      { label: 'Monthly and annual experiments', included: true },
      { label: 'Up to 20 teammate seats', included: true },
      { label: 'Smart usage alerts', included: true },
      { label: 'Self-serve invoice history', included: true },
      { label: 'Forecast snapshots', included: true },
      { label: 'Approval workflows', included: true },
      { label: 'Dedicated success desk', included: false },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    summary: 'For revenue organizations with controls, security, and rollout needs.',
    monthly: 249,
    cta: 'Talk to sales',
    tone: 'Scale without guesswork',
    features: [
      { label: 'Revenue command center', included: true },
      { label: 'Global price-book experiments', included: true },
      { label: 'Unlimited teammate seats', included: true },
      { label: 'Predictive usage alerts', included: true },
      { label: 'Advanced invoice archive', included: true },
      { label: 'Forecast snapshots', included: true },
      { label: 'Approval workflows', included: true },
      { label: 'Dedicated success desk', included: true },
    ],
  },
]

export const comparisonRows = [
  {
    feature: 'Billing workspace',
    starter: 'Core',
    pro: 'Advanced',
    enterprise: 'Custom',
  },
  {
    feature: 'Plan experiments',
    starter: 'Monthly only',
    pro: 'Monthly + yearly',
    enterprise: 'Global price books',
  },
  {
    feature: 'Forecast snapshots',
    starter: false,
    pro: true,
    enterprise: true,
  },
  {
    feature: 'Approval workflows',
    starter: false,
    pro: true,
    enterprise: true,
  },
  {
    feature: 'Custom contract terms',
    starter: false,
    pro: false,
    enterprise: true,
  },
  {
    feature: 'Usage anomaly alerts',
    starter: 'Basic',
    pro: 'Smart',
    enterprise: 'Predictive',
  },
  {
    feature: 'Audit-ready invoice archive',
    starter: false,
    pro: true,
    enterprise: true,
  },
  {
    feature: 'Success support',
    starter: 'Community',
    pro: 'Priority',
    enterprise: 'Dedicated',
  },
]

export const addOns = [
  {
    id: 'forecast',
    name: 'Forecast Pulse',
    summary: 'Weekly revenue drift snapshots and expansion-risk alerts.',
    monthly: 12,
  },
  {
    id: 'approvals',
    name: 'Deal Approvals',
    summary: 'Route discounts, custom terms, and annual upgrades for review.',
    monthly: 19,
  },
  {
    id: 'audit',
    name: 'Audit Vault',
    summary: 'Immutable invoice exports, contract snapshots, and audit trails.',
    monthly: 29,
  },
]

export const getAddonPrice = (addon, billingCycle) =>
  billingCycle === 'yearly' ? Math.round(addon.monthly * 0.8) : addon.monthly

export const faqItems = [
  {
    question: 'Can we change plans after launch?',
    answer:
      'Yes. HelioStack previews the price impact before a plan switch, then keeps the old and new billing terms visible for finance review.',
  },
  {
    question: 'How does yearly billing apply the savings?',
    answer:
      'Yearly mode shows the monthly-equivalent price after a 20% savings rate and labels the plan as billed yearly so the discount is clear.',
  },
  {
    question: 'Do add-ons renew with the selected plan?',
    answer:
      'Add-ons follow the same billing cycle as the active plan. Toggle any add-on to see the total update before checkout.',
  },
  {
    question: 'Are the currency conversions live?',
    answer:
      'This demo uses fixed USD, EUR, and GBP conversion rates so the experience stays deterministic and GitHub Pages friendly.',
  },
]
