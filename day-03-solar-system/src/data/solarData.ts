export type ChapterId =
  | "sun"
  | "inner-planets"
  | "terrestrial-worlds"
  | "gas-giants"
  | "outer-frontier"
  | "overview";

export type PlanetId =
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

export type PlanetPattern = "rocky" | "cloudy" | "terrestrial" | "banded" | "ice" | "storm";

export type QualityMode = "high" | "balanced" | "fallback";

export interface ChapterDefinition {
  id: ChapterId;
  eyebrow: string;
  title: string;
  summary: string;
  body: string;
  accent: string;
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    fov?: number;
  };
}

export interface PlanetDefinition {
  id: PlanetId;
  name: string;
  chapter: ChapterId;
  subtitle: string;
  story: string;
  diameter: string;
  distance: string;
  orbitLabel: string;
  moons: string;
  dayLength: string;
  yearLength: string;
  orbitRadius: number;
  size: number;
  orbitSpeed: number;
  rotationSpeed: number;
  tilt: number;
  focus: {
    position: [number, number, number];
    target: [number, number, number];
  };
  palette: {
    baseA: string;
    baseB: string;
    accent: string;
    glow: string;
  };
  pattern: PlanetPattern;
  hasRing?: boolean;
}

export const chapters: ChapterDefinition[] = [
  {
    id: "sun",
    eyebrow: "Day 03 / Premium Solar System",
    title: "Follow a luminous star into a sculpted orbital journey.",
    summary: "An editorial, scroll-led opening anchored by corona glow, dust, and magnetic color.",
    body: "We begin at the center: a warm solar furnace with layered bloom, drifting dust, and a camera that eases you into the system like the opening shot of a film.",
    accent: "#ffba7a",
    camera: {
      position: [0, 8, 34],
      target: [0, 0, 0],
      fov: 40,
    },
  },
  {
    id: "inner-planets",
    eyebrow: "Chapter 01",
    title: "Skim the mineral heat of the inner worlds.",
    summary: "Fast orbits, sharp terrain contrast, and warmer light define the dense inner ring.",
    body: "Mercury and Venus sit closest to the blast. Their materials should feel compressed, scorched, and reflective in completely different ways.",
    accent: "#ffd4a1",
    camera: {
      position: [24, 7, 28],
      target: [17, 0, 0],
      fov: 42,
    },
  },
  {
    id: "terrestrial-worlds",
    eyebrow: "Chapter 02",
    title: "Shift into the blue-green pulse of habitable and desert terrain.",
    summary: "Earth and Mars become the emotional midpoint, with more readable detail and slower focus pacing.",
    body: "This chapter highlights recognizable surfaces, higher information density, and the cleanest planet-to-copy connection in the experience.",
    accent: "#8fe1ff",
    camera: {
      position: [42, 12, 18],
      target: [30, 0, 0],
      fov: 40,
    },
  },
  {
    id: "gas-giants",
    eyebrow: "Chapter 03",
    title: "Let the frame breathe around striped atmospheres and ring light.",
    summary: "Jupiter and Saturn widen the composition with more scale, softer banding, and heavier atmosphere.",
    body: "The gas giants turn the experience from planetary model into spectacle: big silhouettes, rings, dust, and broader camera motion.",
    accent: "#ffcf96",
    camera: {
      position: [68, 18, 26],
      target: [48, 0, 0],
      fov: 38,
    },
  },
  {
    id: "outer-frontier",
    eyebrow: "Chapter 04",
    title: "Cool the palette and drift into the outer frontier.",
    summary: "Uranus and Neptune close the narrative in colder color, deeper fog, and quieter motion.",
    body: "The outer planets should feel distant and serene, with more blue weight, less solar warmth, and longer visual breathing room.",
    accent: "#8ec7ff",
    camera: {
      position: [94, 22, 38],
      target: [72, 0, 0],
      fov: 36,
    },
  },
  {
    id: "overview",
    eyebrow: "Chapter 05",
    title: "Return to the full architecture of the system.",
    summary: "The ending restores the long view and invites users to dive back in through direct planet jumps.",
    body: "Once the chapters complete, the system opens back up into a calmer overview mode with the HUD guiding deeper exploration.",
    accent: "#b9d7ff",
    camera: {
      position: [32, 24, 104],
      target: [34, 0, 0],
      fov: 34,
    },
  },
];

export const planets: PlanetDefinition[] = [
  {
    id: "mercury",
    name: "Mercury",
    chapter: "inner-planets",
    subtitle: "A compact metallic world with scarred rock and abrupt light falloff.",
    story: "Mercury is rendered as compressed heat and mineral fracture, using tight noise breakup and muted warm reflections.",
    diameter: "4,879 km",
    distance: "57.9 million km",
    orbitLabel: "0.39 AU",
    moons: "0 moons",
    dayLength: "58.6 Earth days",
    yearLength: "88 Earth days",
    orbitRadius: 14,
    size: 1.2,
    orbitSpeed: 1.55,
    rotationSpeed: 0.65,
    tilt: 0.05,
    focus: {
      position: [13, 2.8, 10],
      target: [12, 0, 0],
    },
    palette: {
      baseA: "#9a8f86",
      baseB: "#534946",
      accent: "#d7c3b3",
      glow: "#ffbc85",
    },
    pattern: "rocky",
  },
  {
    id: "venus",
    name: "Venus",
    chapter: "inner-planets",
    subtitle: "A soft gold furnace wrapped in dense atmosphere and diffused sheen.",
    story: "Venus leans on hazy banding and creamy glow rather than exposed terrain, giving it a softer but more oppressive presence.",
    diameter: "12,104 km",
    distance: "108.2 million km",
    orbitLabel: "0.72 AU",
    moons: "0 moons",
    dayLength: "243 Earth days",
    yearLength: "225 Earth days",
    orbitRadius: 20,
    size: 2.15,
    orbitSpeed: 1.18,
    rotationSpeed: -0.22,
    tilt: -0.04,
    focus: {
      position: [18, 3.6, 14],
      target: [18, 0, 0],
    },
    palette: {
      baseA: "#f7d39d",
      baseB: "#9d6848",
      accent: "#fff0cb",
      glow: "#ffd19a",
    },
    pattern: "cloudy",
  },
  {
    id: "earth",
    name: "Earth",
    chapter: "terrestrial-worlds",
    subtitle: "Cloud bands, ocean depth, and crisp atmosphere carry the emotional midpoint.",
    story: "Earth gets the cleanest material layering in the piece: procedural ocean breakup, bright cloud streaks, and a cool rim light that reads immediately.",
    diameter: "12,742 km",
    distance: "149.6 million km",
    orbitLabel: "1.00 AU",
    moons: "1 moon",
    dayLength: "24 hours",
    yearLength: "365 days",
    orbitRadius: 28,
    size: 2.45,
    orbitSpeed: 1,
    rotationSpeed: 1.2,
    tilt: 0.41,
    focus: {
      position: [30, 4.2, 12],
      target: [27, 0, 0],
    },
    palette: {
      baseA: "#2d89ff",
      baseB: "#10318b",
      accent: "#8fe8ff",
      glow: "#8fd2ff",
    },
    pattern: "terrestrial",
  },
  {
    id: "mars",
    name: "Mars",
    chapter: "terrestrial-worlds",
    subtitle: "A rusted desert sphere with cold shadows and ember-red highlights.",
    story: "Mars contrasts Earth with sharper erosion, iron oxide color, and more exposed breakup in the shader pattern.",
    diameter: "6,779 km",
    distance: "227.9 million km",
    orbitLabel: "1.52 AU",
    moons: "2 moons",
    dayLength: "24.6 hours",
    yearLength: "687 days",
    orbitRadius: 36,
    size: 1.95,
    orbitSpeed: 0.8,
    rotationSpeed: 0.96,
    tilt: 0.44,
    focus: {
      position: [36, 3.2, 11],
      target: [34, 0, 0],
    },
    palette: {
      baseA: "#cf7045",
      baseB: "#6c271e",
      accent: "#ffbf8c",
      glow: "#ff9b6a",
    },
    pattern: "rocky",
  },
  {
    id: "jupiter",
    name: "Jupiter",
    chapter: "gas-giants",
    subtitle: "Broad storm bands, warm haze, and overwhelming scale dominate the frame.",
    story: "Jupiter is where the scene opens up. Its material relies on sweeping bands, storm breakup, and a bigger halo response than the inner planets.",
    diameter: "139,820 km",
    distance: "778.5 million km",
    orbitLabel: "5.20 AU",
    moons: "95 moons",
    dayLength: "9.9 hours",
    yearLength: "11.9 years",
    orbitRadius: 48,
    size: 5.85,
    orbitSpeed: 0.42,
    rotationSpeed: 1.9,
    tilt: 0.08,
    focus: {
      position: [54, 9, 18],
      target: [46, 0, 0],
    },
    palette: {
      baseA: "#ecd6ac",
      baseB: "#8a573d",
      accent: "#fff0ce",
      glow: "#ffd497",
    },
    pattern: "banded",
  },
  {
    id: "saturn",
    name: "Saturn",
    chapter: "gas-giants",
    subtitle: "A pale atmospheric giant suspended inside a luminous ring field.",
    story: "Saturn is built for elegance instead of weight, with cleaner banding, broader rim light, and a ring shader that reads as layered ice and dust.",
    diameter: "116,460 km",
    distance: "1.43 billion km",
    orbitLabel: "9.58 AU",
    moons: "146 moons",
    dayLength: "10.7 hours",
    yearLength: "29.4 years",
    orbitRadius: 61,
    size: 5.25,
    orbitSpeed: 0.29,
    rotationSpeed: 1.7,
    tilt: 0.48,
    focus: {
      position: [68, 8, 22],
      target: [60, 0, 0],
    },
    palette: {
      baseA: "#f2d9ab",
      baseB: "#b18453",
      accent: "#fff0ca",
      glow: "#ffe1a3",
    },
    pattern: "banded",
    hasRing: true,
  },
  {
    id: "uranus",
    name: "Uranus",
    chapter: "outer-frontier",
    subtitle: "Cool glassy cyan with a tilted axis and quieter material rhythm.",
    story: "Uranus shifts the entire palette colder. The shader uses smoother gradients and frozen band hints rather than storm-heavy structure.",
    diameter: "50,724 km",
    distance: "2.87 billion km",
    orbitLabel: "19.2 AU",
    moons: "28 moons",
    dayLength: "17.2 hours",
    yearLength: "84 years",
    orbitRadius: 76,
    size: 3.95,
    orbitSpeed: 0.19,
    rotationSpeed: 1.1,
    tilt: 1.71,
    focus: {
      position: [84, 7, 18],
      target: [74, 0, 0],
    },
    palette: {
      baseA: "#bff5ff",
      baseB: "#3d8dad",
      accent: "#e5ffff",
      glow: "#9ee6ff",
    },
    pattern: "ice",
  },
  {
    id: "neptune",
    name: "Neptune",
    chapter: "outer-frontier",
    subtitle: "A saturated deep-blue frontier marked by smooth but powerful storm motion.",
    story: "Neptune closes the sequence with richer contrast, cooler glow, and a storm-biased pattern that feels alive without becoming chaotic.",
    diameter: "49,244 km",
    distance: "4.50 billion km",
    orbitLabel: "30.1 AU",
    moons: "16 moons",
    dayLength: "16.1 hours",
    yearLength: "164.8 years",
    orbitRadius: 90,
    size: 3.9,
    orbitSpeed: 0.12,
    rotationSpeed: 1.16,
    tilt: 0.52,
    focus: {
      position: [99, 8, 24],
      target: [88, 0, 0],
    },
    palette: {
      baseA: "#4c82ff",
      baseB: "#152f9b",
      accent: "#a9e2ff",
      glow: "#78b2ff",
    },
    pattern: "storm",
  },
];

export const defaultChapterId: ChapterId = "sun";

export const chaptersById = Object.fromEntries(chapters.map((chapter) => [chapter.id, chapter])) as Record<ChapterId, ChapterDefinition>;
export const planetsById = Object.fromEntries(planets.map((planet) => [planet.id, planet])) as Record<PlanetId, PlanetDefinition>;
