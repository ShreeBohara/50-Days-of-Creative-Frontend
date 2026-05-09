export const navItems = [
  { label: 'Product', href: '#features' },
  { label: 'Workflow', href: '#workflow' },
  { label: 'Customers', href: '#customers' },
  { label: 'Pricing', href: '#pricing' },
]

export const logos = ['Northstar', 'VantaGrid', 'Kitebase', 'PulseOps', 'BrightLayer', 'Orbitly']

export const features = [
  {
    title: 'Launch rooms',
    metric: '12m',
    copy: 'Turn strategy, owner updates, files, and launch tasks into one shared command surface.',
    tone: 'violet',
  },
  {
    title: 'Signal scoring',
    metric: '92%',
    copy: 'Prioritize work by live customer risk, revenue weight, and team capacity instead of noisy queues.',
    tone: 'blue',
  },
  {
    title: 'AI briefs',
    copy: 'Summarize decisions, blockers, and next moves from every channel before standup starts.',
    tone: 'cyan',
  },
  {
    title: 'Automated handoffs',
    copy: 'Route work between success, product, and engineering with audit-ready context attached.',
    tone: 'pink',
  },
  {
    title: 'Executive lens',
    copy: 'Give leadership a calm readout of risks, wins, and forecast movement without another slide deck.',
    tone: 'amber',
  },
  {
    title: 'Realtime sync',
    copy: 'Keep CRM, ticketing, and product telemetry aligned with two-way updates and ownership trails.',
    tone: 'green',
  },
]

export const workflowSteps = [
  {
    title: 'Connect',
    copy: 'Bring customer accounts, tasks, docs, and product events into a secure workspace.',
  },
  {
    title: 'Prioritize',
    copy: 'Let risk scoring and launch goals shape the daily queue before the team opens Slack.',
  },
  {
    title: 'Execute',
    copy: 'Ship coordinated updates with automated handoffs, approval trails, and stakeholder recaps.',
  },
]

export const stats = [
  { value: 41, suffix: '%', label: 'faster launch cycles', progress: 82 },
  { value: 3.8, suffix: 'x', label: 'more surfaced risks', progress: 76 },
  { value: 18, suffix: 'hrs', label: 'saved per team weekly', progress: 68 },
  { value: 97, suffix: '%', label: 'stakeholder visibility', progress: 91 },
]

export const testimonials = [
  {
    quote: 'NovaDesk replaced three weekly syncs and gave every launch owner a shared, trusted readout.',
    name: 'Maya Chen',
    role: 'VP Customer Operations, Northstar',
  },
  {
    quote: 'The motion from signal to action is finally visible. Our team can see where revenue risk is moving.',
    name: 'Theo Ramirez',
    role: 'Head of Product, PulseOps',
  },
  {
    quote: 'We went from spreadsheet theater to an operating rhythm the whole company understands.',
    name: 'Priya Shah',
    role: 'COO, Kitebase',
  },
  {
    quote: 'The executive lens is the first dashboard our leadership team actually keeps open.',
    name: 'Jon Bell',
    role: 'Revenue Strategy, Orbitly',
  },
]

export const pricing = [
  {
    name: 'Starter',
    monthly: 49,
    yearly: 39,
    description: 'For lean teams building their first repeatable launch motion.',
    features: ['5 launch rooms', 'Core integrations', 'Weekly recap briefs'],
  },
  {
    name: 'Scale',
    monthly: 129,
    yearly: 99,
    description: 'For growing SaaS teams coordinating revenue-critical programs.',
    features: ['Unlimited rooms', 'Signal scoring', 'Custom stakeholder views', 'Priority automations'],
    popular: true,
  },
  {
    name: 'Enterprise',
    monthly: 289,
    yearly: 229,
    description: 'For complex organizations with strict security and workflow needs.',
    features: ['SSO and SCIM', 'Dedicated success architect', 'Advanced audit exports'],
  },
]

export const faqs = [
  {
    question: 'Can NovaDesk replace our project management tool?',
    answer:
      'NovaDesk connects the tools you already use and adds a launch operating layer for prioritization, executive visibility, and customer-risk handoffs.',
  },
  {
    question: 'How quickly can a team onboard?',
    answer:
      'Most teams connect their core systems in one afternoon, then launch their first shared room with imported accounts, owners, tasks, and signals.',
  },
  {
    question: 'Do animations affect accessibility?',
    answer:
      'The page and product respect reduced-motion preferences, preserve keyboard access, and keep all primary content readable without motion.',
  },
  {
    question: 'Is there a security review package?',
    answer:
      'Enterprise plans include SSO, SCIM, audit exports, data residency options, and a security packet for procurement teams.',
  },
]

export const footerColumns = [
  { title: 'Product', links: ['Rooms', 'Signals', 'Automations', 'Analytics'] },
  { title: 'Company', links: ['Customers', 'Security', 'Careers', 'Press'] },
  { title: 'Resources', links: ['Guides', 'Templates', 'API docs', 'Status'] },
]
