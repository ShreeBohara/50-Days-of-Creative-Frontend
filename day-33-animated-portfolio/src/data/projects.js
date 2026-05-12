/**
 * Mock project data for the portfolio.
 * 6 projects with unique accent colors and gradient thumbnails.
 */
const projects = [
  {
    id: 'aurora-dashboard',
    title: 'Aurora Dashboard',
    subtitle: 'Analytics Platform',
    category: 'Web App',
    year: '2025',
    description: `A real-time analytics dashboard with animated data visualizations, dark theme design, and live-updating charts. Built to handle millions of data points with smooth 60fps rendering and an intuitive drag-and-drop interface for custom widget layouts.`,
    longDescription: `Aurora Dashboard reimagines data analytics with a cinematic dark interface and fluid animations. Every chart, graph, and metric card responds to data changes with carefully choreographed transitions that make complex information feel intuitive and alive.

The project challenged conventional dashboard design by treating data visualization as a storytelling medium. Each widget animates independently, creating a living canvas of information that users can customize to their workflow.`,
    tech: ['React', 'D3.js', 'Framer Motion', 'WebSocket'],
    role: 'Lead Developer & Designer',
    duration: '3 months',
    accentColor: '#6366F1',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A78BFA 100%)',
    images: [
      'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
      'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
      'linear-gradient(135deg, #A78BFA 0%, #C4B5FD 100%)',
    ],
  },
  {
    id: 'nebula-store',
    title: 'Nebula Store',
    subtitle: 'E-Commerce Experience',
    category: 'E-Commerce',
    year: '2025',
    description: `A premium e-commerce platform with 3D product previews, gesture-based navigation, and a checkout flow that feels effortless. Custom cursor interactions and page transitions create a luxury digital shopping experience.`,
    longDescription: `Nebula Store pushes the boundaries of online retail by merging cinematic web design with practical e-commerce functionality. Products float in 3D space, and every interaction from browsing to checkout is choreographed with purpose.

The design philosophy centers on reducing friction while maximizing visual impact. Micro-interactions guide users through the purchase journey, while the 3D product viewer gives shoppers the confidence of an in-store experience.`,
    tech: ['Next.js', 'Three.js', 'Stripe', 'Sanity CMS'],
    role: 'Full-Stack Developer',
    duration: '4 months',
    accentColor: '#EC4899',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #F472B6 50%, #F9A8D4 100%)',
    images: [
      'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)',
      'linear-gradient(135deg, #F472B6 0%, #F9A8D4 100%)',
      'linear-gradient(135deg, #F9A8D4 0%, #FBCFE8 100%)',
    ],
  },
  {
    id: 'wave-music',
    title: 'Wave Music',
    subtitle: 'Audio Streaming App',
    category: 'Web App',
    year: '2024',
    description: `A music streaming interface with real-time audio visualizations, waveform scrubbing, and adaptive color themes that shift based on album artwork. Spatial audio controls create an immersive listening environment.`,
    longDescription: `Wave Music transforms passive listening into a visual experience. The interface breathes with the music — colors shift, waveforms dance, and the entire UI responds to beat and tempo in real-time.

Built with the Web Audio API at its core, every visual element is driven by actual audio data. The result is a deeply personal and immersive music player that makes every song feel like a unique visual performance.`,
    tech: ['React', 'Web Audio API', 'Canvas', 'Tone.js'],
    role: 'Frontend Developer',
    duration: '2 months',
    accentColor: '#14B8A6',
    gradient: 'linear-gradient(135deg, #14B8A6 0%, #2DD4BF 50%, #5EEAD4 100%)',
    images: [
      'linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%)',
      'linear-gradient(135deg, #2DD4BF 0%, #5EEAD4 100%)',
      'linear-gradient(135deg, #5EEAD4 0%, #99F6E4 100%)',
    ],
  },
  {
    id: 'prism-portfolio',
    title: 'Prism Portfolio',
    subtitle: 'Creative Showcase',
    category: 'Portfolio',
    year: '2024',
    description: `An award-winning portfolio site with WebGL shader backgrounds, magnetic cursor effects, and scroll-driven storytelling. Every page transition is a carefully orchestrated cinematic sequence.`,
    longDescription: `Prism Portfolio was born from the belief that a portfolio should be a project in itself — a living demonstration of creative capability. Every pixel, every animation, every interaction is intentional.

The site features custom GLSL shaders that respond to user interaction, creating a unique visual fingerprint for each visitor. Page transitions were designed to feel like turning pages in a high-end design book.`,
    tech: ['React', 'GSAP', 'WebGL', 'GLSL Shaders'],
    role: 'Creative Developer',
    duration: '2 months',
    accentColor: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 50%, #FCD34D 100%)',
    images: [
      'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
      'linear-gradient(135deg, #FBBF24 0%, #FCD34D 100%)',
      'linear-gradient(135deg, #FCD34D 0%, #FDE68A 100%)',
    ],
  },
  {
    id: 'flux-kanban',
    title: 'Flux Kanban',
    subtitle: 'Project Management Tool',
    category: 'SaaS',
    year: '2024',
    description: `A drag-and-drop project board with silky Framer Motion animations, real-time collaboration, and adaptive card layouts. State management with Zustand keeps everything lightning fast.`,
    longDescription: `Flux Kanban reimagines project management with animation-first design thinking. Every card drag, column reorder, and status change is accompanied by physics-based motion that makes the interface feel tangible.

The challenge was balancing visual richness with performance. By using Framer Motion's layout animations and Zustand's atomic state updates, the board handles hundreds of cards while maintaining 60fps interactions.`,
    tech: ['React', 'Framer Motion', 'Zustand', 'Socket.io'],
    role: 'Lead Frontend Developer',
    duration: '3 months',
    accentColor: '#EF4444',
    gradient: 'linear-gradient(135deg, #EF4444 0%, #F87171 50%, #FCA5A5 100%)',
    images: [
      'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
      'linear-gradient(135deg, #F87171 0%, #FCA5A5 100%)',
      'linear-gradient(135deg, #FCA5A5 0%, #FECACA 100%)',
    ],
  },
  {
    id: 'terra-maps',
    title: 'Terra Maps',
    subtitle: 'Geospatial Platform',
    category: 'Data Viz',
    year: '2023',
    description: `An interactive mapping platform with custom vector tile rendering, 3D terrain visualization, and data-driven heat maps. Handles millions of geographic data points with GPU-accelerated rendering.`,
    longDescription: `Terra Maps brings geographic data to life through a custom-built rendering engine that transforms raw coordinates into stunning visual narratives. The platform supports multiple map styles and real-time data overlays.

The technical foundation uses WebGL for GPU-accelerated tile rendering, allowing smooth zooming and panning even with dense data layers. Custom shaders create the atmospheric terrain effects that give the maps their distinctive character.`,
    tech: ['React', 'MapboxGL', 'WebGL', 'Turf.js'],
    role: 'Frontend Engineer',
    duration: '5 months',
    accentColor: '#22C55E',
    gradient: 'linear-gradient(135deg, #22C55E 0%, #4ADE80 50%, #86EFAC 100%)',
    images: [
      'linear-gradient(135deg, #22C55E 0%, #4ADE80 100%)',
      'linear-gradient(135deg, #4ADE80 0%, #86EFAC 100%)',
      'linear-gradient(135deg, #86EFAC 0%, #BBF7D0 100%)',
    ],
  },
]

export default projects
