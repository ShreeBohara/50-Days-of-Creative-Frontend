import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.166.1/+esm";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.166.1/examples/jsm/controls/OrbitControls.js/+esm";

function showFatalError(message) {
  if (document.querySelector("[data-scene-error]")) {
    return;
  }

  const panel = document.createElement("div");
  panel.setAttribute("data-scene-error", "");
  panel.setAttribute("role", "status");
  panel.style.position = "fixed";
  panel.style.right = "1rem";
  panel.style.bottom = "1rem";
  panel.style.zIndex = "10";
  panel.style.maxWidth = "min(28rem, calc(100vw - 2rem))";
  panel.style.padding = "0.9rem 1rem";
  panel.style.border = "1px solid rgba(255, 159, 122, 0.38)";
  panel.style.borderRadius = "1rem";
  panel.style.background = "rgba(28, 10, 14, 0.86)";
  panel.style.color = "#ffe4d8";
  panel.style.backdropFilter = "blur(18px)";
  panel.style.webkitBackdropFilter = "blur(18px)";
  panel.style.boxShadow = "0 1rem 2.4rem rgba(0, 0, 0, 0.35)";
  panel.textContent = `Scene error: ${message}`;
  document.body.append(panel);
}

window.addEventListener("error", (event) => {
  const message = event.error?.message ?? event.message;

  if (message) {
    showFatalError(message);
  }
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason);
  showFatalError(message);
});

const sceneRoot = document.querySelector("[data-scene-root]");
const infoPanel = document.querySelector("[data-info-panel]");
const closePanelButton = document.querySelector("[data-close-panel]");
const planetName = document.querySelector("[data-planet-name]");
const planetTagline = document.querySelector("[data-planet-tagline]");
const planetDiameter = document.querySelector("[data-planet-diameter]");
const planetDistance = document.querySelector("[data-planet-distance]");
const planetSpeed = document.querySelector("[data-planet-speed]");
const planetFact = document.querySelector("[data-planet-fact]");

const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 18, 92);
const DEFAULT_LOOK_AT = new THREE.Vector3(0, 0, 0);
const OVERVIEW_MIN_DISTANCE = 24;
const OVERVIEW_MAX_DISTANCE = 140;
const CAMERA_LERP = 0.065;
const TARGET_LERP = 0.11;
const IDLE_AUTOROTATE_DELAY = 1800;

const PLANET_CONFIG = [
  {
    name: "Mercury",
    tagline: "A scorched rock with cratered terrain and sharp temperature swings.",
    radius: 1.2,
    orbitRadius: 12,
    orbitSpeed: 1.61,
    rotationSpeed: 0.011,
    orbitTilt: 0.05,
    axialTilt: 0.03,
    diameter: "4,879 km",
    distance: "57.9 million km",
    orbitPace: "1.61x Earth",
    funFact: "Mercury races around the Sun in just 88 Earth days.",
    surface: {
      pattern: "rocky",
      palette: ["#7e716f", "#aea19c", "#625755"],
      haze: "#b8997b",
      roughness: 0.93,
      metalness: 0.03,
    },
  },
  {
    name: "Venus",
    tagline: "An acid-cloud furnace wrapped in thick, reflective atmosphere.",
    radius: 2.1,
    orbitRadius: 16,
    orbitSpeed: 1.18,
    rotationSpeed: -0.004,
    orbitTilt: -0.03,
    axialTilt: 3.09,
    diameter: "12,104 km",
    distance: "108.2 million km",
    orbitPace: "1.18x Earth",
    funFact: "Venus spins backwards, so the Sun would rise in the west there.",
    surface: {
      pattern: "cloudy",
      palette: ["#f5d49a", "#dca86f", "#926144"],
      haze: "#ffd4ab",
      roughness: 0.86,
      metalness: 0.04,
    },
  },
  {
    name: "Earth",
    tagline: "A blue marble of oceans, continents, and bright cloud bands.",
    radius: 2.35,
    orbitRadius: 21,
    orbitSpeed: 1,
    rotationSpeed: 0.024,
    orbitTilt: 0.01,
    axialTilt: 0.41,
    diameter: "12,742 km",
    distance: "149.6 million km",
    orbitPace: "1.00x Earth",
    funFact: "Earth is the only known world with surface oceans of liquid water.",
    surface: {
      pattern: "terrestrial",
      palette: ["#1f5fba", "#2d89ff", "#74c58e", "#f5f0d6"],
      haze: "#8ae2ff",
      roughness: 0.81,
      metalness: 0.05,
    },
  },
  {
    name: "Mars",
    tagline: "A dusty red desert marked by canyons, volcanoes, and polar ice.",
    radius: 1.8,
    orbitRadius: 27,
    orbitSpeed: 0.8,
    rotationSpeed: 0.02,
    orbitTilt: -0.04,
    axialTilt: 0.44,
    diameter: "6,779 km",
    distance: "227.9 million km",
    orbitPace: "0.80x Earth",
    funFact: "Mars hosts Olympus Mons, the tallest volcano known in the solar system.",
    surface: {
      pattern: "rocky",
      palette: ["#cf7045", "#a2482b", "#6f2d22"],
      haze: "#ffaf79",
      roughness: 0.9,
      metalness: 0.02,
    },
  },
  {
    name: "Jupiter",
    tagline: "A colossal gas giant with striped clouds and a restless storm belt.",
    radius: 5.9,
    orbitRadius: 35,
    orbitSpeed: 0.44,
    rotationSpeed: 0.041,
    orbitTilt: 0.02,
    axialTilt: 0.05,
    diameter: "139,820 km",
    distance: "778.5 million km",
    orbitPace: "0.44x Earth",
    funFact: "Jupiter's Great Red Spot is a storm large enough to swallow Earth.",
    surface: {
      pattern: "banded",
      palette: ["#e8d2aa", "#b7784e", "#7b4d36", "#f5e0c3"],
      haze: "#ffe2b2",
      roughness: 0.79,
      metalness: 0.03,
    },
  },
  {
    name: "Saturn",
    tagline: "A pale gas giant wrapped in luminous rings of ice and dust.",
    radius: 5.2,
    orbitRadius: 43,
    orbitSpeed: 0.29,
    rotationSpeed: 0.037,
    orbitTilt: -0.02,
    axialTilt: 0.47,
    diameter: "116,460 km",
    distance: "1.43 billion km",
    orbitPace: "0.29x Earth",
    funFact: "Saturn would float in a giant ocean because its average density is so low.",
    surface: {
      pattern: "banded",
      palette: ["#f3d9a7", "#d7b37d", "#aa8454", "#fae8c6"],
      haze: "#ffe5ad",
      roughness: 0.77,
      metalness: 0.03,
    },
  },
  {
    name: "Uranus",
    tagline: "A tilted ice giant glowing in cool cyan and sea-glass tones.",
    radius: 3.8,
    orbitRadius: 51,
    orbitSpeed: 0.19,
    rotationSpeed: 0.026,
    orbitTilt: 0.03,
    axialTilt: 1.71,
    diameter: "50,724 km",
    distance: "2.87 billion km",
    orbitPace: "0.19x Earth",
    funFact: "Uranus rolls around the Sun on its side with an extreme axial tilt.",
    surface: {
      pattern: "ice",
      palette: ["#bef8ff", "#78d1da", "#4594af"],
      haze: "#c6ffff",
      roughness: 0.74,
      metalness: 0.08,
    },
  },
  {
    name: "Neptune",
    tagline: "A deep blue ice giant streaked with supersonic storm systems.",
    radius: 3.7,
    orbitRadius: 59,
    orbitSpeed: 0.12,
    rotationSpeed: 0.029,
    orbitTilt: -0.01,
    axialTilt: 0.52,
    diameter: "49,244 km",
    distance: "4.50 billion km",
    orbitPace: "0.12x Earth",
    funFact: "Neptune's winds can roar faster than the speed of sound on Earth.",
    surface: {
      pattern: "storm",
      palette: ["#3d74ff", "#1d3baf", "#88d9ff"],
      haze: "#79b7ff",
      roughness: 0.78,
      metalness: 0.06,
    },
  },
];

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
sceneRoot.append(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02050d);
scene.fog = new THREE.FogExp2(0x030611, 0.0032);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 420);
camera.position.copy(DEFAULT_CAMERA_POSITION);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.dampingFactor = 0.05;
controls.minDistance = OVERVIEW_MIN_DISTANCE;
controls.maxDistance = OVERVIEW_MAX_DISTANCE;
controls.autoRotate = false;
controls.autoRotateSpeed = 0.28;
controls.target.copy(DEFAULT_LOOK_AT);

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const solarSystem = new THREE.Group();
const starfieldGroup = new THREE.Group();
const desiredCameraPosition = DEFAULT_CAMERA_POSITION.clone();
const desiredLookAt = DEFAULT_LOOK_AT.clone();
const focusOffset = new THREE.Vector3();
const selectedWorldPosition = new THREE.Vector3();
const tempVector = new THREE.Vector3();
const idleDrift = new THREE.Vector3(0, 0, 0);

let selectedPlanetEntry = null;
let hoveredPlanetEntry = null;
let userIsControlling = false;
let lastInteractionTime = window.performance.now();
let pointerDownInfo = null;

scene.add(solarSystem);
scene.add(starfieldGroup);

const ambientLight = new THREE.AmbientLight(0x8fb0ff, 0.42);
scene.add(ambientLight);

createSun();
createStars();
const planetEntries = createPlanets();
updateInfoPanel(PLANET_CONFIG[2]);

controls.addEventListener("start", () => {
  userIsControlling = true;
  lastInteractionTime = window.performance.now();
});

controls.addEventListener("end", () => {
  userIsControlling = false;
  lastInteractionTime = window.performance.now();
});

renderer.domElement.addEventListener("pointerdown", (event) => {
  pointerDownInfo = { x: event.clientX, y: event.clientY };
  lastInteractionTime = window.performance.now();
});

renderer.domElement.addEventListener("pointermove", (event) => {
  setPointerFromEvent(event);
  const hoveredEntry = getPlanetFromPointer();

  if (hoveredEntry) {
    document.body.style.cursor = "pointer";
  } else {
    document.body.style.cursor = "";
  }

  hoveredPlanetEntry = hoveredEntry;
});

renderer.domElement.addEventListener("pointerleave", () => {
  hoveredPlanetEntry = null;
  document.body.style.cursor = "";
});

renderer.domElement.addEventListener("pointerup", (event) => {
  if (!pointerDownInfo) {
    return;
  }

  const travelled = Math.hypot(event.clientX - pointerDownInfo.x, event.clientY - pointerDownInfo.y);
  pointerDownInfo = null;

  if (travelled > 8) {
    return;
  }

  setPointerFromEvent(event);
  const clickedEntry = getPlanetFromPointer();

  if (clickedEntry) {
    focusOnPlanet(clickedEntry);
  } else {
    clearPlanetFocus();
  }
});

closePanelButton.addEventListener("click", () => {
  clearPlanetFocus();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    clearPlanetFocus();
  }
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(render);

function createSun() {
  const sunGroup = new THREE.Group();

  const sunGeometry = new THREE.SphereGeometry(6.4, 64, 64);
  const sunMaterial = new THREE.MeshStandardMaterial({
    color: 0xffc36a,
    emissive: 0xff8b2a,
    emissiveIntensity: 1.9,
    roughness: 0.78,
    metalness: 0.02,
  });
  const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
  sunGroup.add(sunMesh);

  const coronaGeometry = new THREE.SphereGeometry(8.4, 48, 48);
  const coronaMaterial = new THREE.MeshBasicMaterial({
    color: 0xffb55a,
    transparent: true,
    opacity: 0.17,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const coronaMesh = new THREE.Mesh(coronaGeometry, coronaMaterial);
  sunGroup.add(coronaMesh);

  const flareTexture = createGlowTexture("#ffdd9b", "#ff8f2f");
  const flareMaterial = new THREE.SpriteMaterial({
    map: flareTexture,
    color: 0xffd285,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const flareSprite = new THREE.Sprite(flareMaterial);
  flareSprite.scale.setScalar(24);
  sunGroup.add(flareSprite);

  const sunLight = new THREE.PointLight(0xffd18b, 2.4, 260, 1.6);
  sunGroup.add(sunLight);

  solarSystem.add(sunGroup);
}

function createStars() {
  const starCount = 1400;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const color = new THREE.Color();

  for (let index = 0; index < starCount; index += 1) {
    const radius = THREE.MathUtils.randFloat(110, 280);
    const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi) * THREE.MathUtils.randFloat(0.35, 1);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const offset = index * 3;

    positions[offset] = x;
    positions[offset + 1] = y;
    positions[offset + 2] = z;

    color.setHSL(
      THREE.MathUtils.randFloat(0.52, 0.66),
      THREE.MathUtils.randFloat(0.45, 0.8),
      THREE.MathUtils.randFloat(0.72, 0.98)
    );

    colors[offset] = color.r;
    colors[offset + 1] = color.g;
    colors[offset + 2] = color.b;
  }

  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  starGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const starMaterial = new THREE.PointsMaterial({
    size: 0.8,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.92,
    vertexColors: true,
    depthWrite: false,
  });

  const stars = new THREE.Points(starGeometry, starMaterial);
  starfieldGroup.add(stars);

  const distantStars = new THREE.Points(starGeometry.clone(), new THREE.PointsMaterial({
    size: 0.45,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.35,
    vertexColors: true,
    depthWrite: false,
  }));
  distantStars.scale.setScalar(1.45);
  distantStars.rotation.y = 0.8;
  starfieldGroup.add(distantStars);
}

function createPlanets() {
  return PLANET_CONFIG.map((config, index) => {
    const orbitGroup = new THREE.Group();
    orbitGroup.rotation.x = config.orbitTilt;
    orbitGroup.rotation.y = index * 0.45 + 0.4;

    const mesh = createPlanetMesh(config);
    mesh.position.x = config.orbitRadius;
    mesh.rotation.z = config.axialTilt;
    mesh.userData.planetName = config.name;
    orbitGroup.add(mesh);

    solarSystem.add(orbitGroup);
    solarSystem.add(createOrbitLine(config));

    if (config.name === "Saturn") {
      mesh.add(createSaturnRing());
    }

    return {
      config,
      orbitGroup,
      mesh,
    };
  });
}

function createPlanetMesh(config) {
  const texture = createPlanetTexture(config);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    color: 0xffffff,
    roughness: config.surface.roughness,
    metalness: config.surface.metalness,
    emissive: new THREE.Color(config.surface.haze).multiplyScalar(0.09),
    emissiveIntensity: 0.09,
  });
  const geometry = new THREE.SphereGeometry(config.radius, 48, 48);
  return new THREE.Mesh(geometry, material);
}

function createPlanetTexture(config) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);

  config.surface.palette.forEach((stopColor, index, palette) => {
    gradient.addColorStop(index / Math.max(palette.length - 1, 1), stopColor);
  });

  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (config.surface.pattern === "banded" || config.surface.pattern === "storm") {
    paintBands(context, canvas, config.surface.palette, config.surface.pattern === "storm");
  }

  if (config.surface.pattern === "rocky" || config.surface.pattern === "terrestrial") {
    paintRockySurface(context, canvas, config.surface.palette, config.surface.pattern === "terrestrial");
  }

  if (config.surface.pattern === "cloudy" || config.surface.pattern === "ice") {
    paintClouds(context, canvas, config.surface.palette, config.surface.pattern === "ice");
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function paintBands(context, canvas, palette, addStormSpot) {
  for (let band = 0; band < 18; band += 1) {
    const y = (band / 18) * canvas.height;
    const waveHeight = THREE.MathUtils.randFloat(8, 26);
    const bandHeight = THREE.MathUtils.randFloat(16, 36);
    const bandColor = palette[band % palette.length];

    context.fillStyle = `${bandColor}88`;
    context.beginPath();
    context.moveTo(0, y);

    for (let x = 0; x <= canvas.width; x += 64) {
      const wave = Math.sin((x / canvas.width) * Math.PI * 4 + band * 0.7) * waveHeight;
      context.lineTo(x, y + wave);
    }

    context.lineTo(canvas.width, y + bandHeight);
    context.lineTo(0, y + bandHeight);
    context.closePath();
    context.fill();
  }

  if (addStormSpot) {
    context.fillStyle = "#dde8ff77";
    context.beginPath();
    context.ellipse(canvas.width * 0.58, canvas.height * 0.56, 86, 44, 0.3, 0, Math.PI * 2);
    context.fill();
  }
}

function paintRockySurface(context, canvas, palette, addWater) {
  for (let spot = 0; spot < 280; spot += 1) {
    const radius = THREE.MathUtils.randFloat(6, addWater ? 40 : 24);
    const x = THREE.MathUtils.randFloat(0, canvas.width);
    const y = THREE.MathUtils.randFloat(0, canvas.height);
    const color = palette[Math.floor(Math.random() * palette.length)];

    context.globalAlpha = THREE.MathUtils.randFloat(addWater ? 0.12 : 0.18, addWater ? 0.4 : 0.5);
    context.fillStyle = color;
    context.beginPath();
    context.ellipse(x, y, radius * THREE.MathUtils.randFloat(1.1, 1.7), radius, Math.random(), 0, Math.PI * 2);
    context.fill();
  }

  context.globalAlpha = 1;

  if (addWater) {
    context.fillStyle = "#ffffff66";
    for (let cloud = 0; cloud < 40; cloud += 1) {
      const x = THREE.MathUtils.randFloat(0, canvas.width);
      const y = THREE.MathUtils.randFloat(0, canvas.height);
      const width = THREE.MathUtils.randFloat(40, 100);
      const height = THREE.MathUtils.randFloat(10, 24);
      context.beginPath();
      context.ellipse(x, y, width, height, Math.random(), 0, Math.PI * 2);
      context.fill();
    }
  }
}

function paintClouds(context, canvas, palette, isIceWorld) {
  for (let stripe = 0; stripe < 14; stripe += 1) {
    const y = (stripe / 14) * canvas.height;
    const color = palette[stripe % palette.length];
    const alpha = isIceWorld ? "55" : "66";
    context.fillStyle = `${color}${alpha}`;
    context.fillRect(0, y, canvas.width, THREE.MathUtils.randFloat(14, 34));
  }

  context.fillStyle = "#ffffff55";
  for (let cloud = 0; cloud < 80; cloud += 1) {
    const x = THREE.MathUtils.randFloat(0, canvas.width);
    const y = THREE.MathUtils.randFloat(0, canvas.height);
    const width = THREE.MathUtils.randFloat(24, isIceWorld ? 86 : 120);
    const height = THREE.MathUtils.randFloat(8, isIceWorld ? 16 : 20);
    context.beginPath();
    context.ellipse(x, y, width, height, Math.random(), 0, Math.PI * 2);
    context.fill();
  }
}

function createOrbitLine(config) {
  const segments = 180;
  const points = [];

  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * config.orbitRadius, 0, Math.sin(angle) * config.orbitRadius));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color: 0x9fbef0,
    transparent: true,
    opacity: 0.22,
    dashSize: 0.55,
    gapSize: 0.45,
  });

  const orbitLine = new THREE.Line(geometry, material);
  orbitLine.computeLineDistances();
  orbitLine.rotation.x = config.orbitTilt;
  return orbitLine;
}

function createSaturnRing() {
  const ringTexture = createRingTexture();
  const geometry = new THREE.RingGeometry(6.8, 10.4, 96);
  const material = new THREE.MeshBasicMaterial({
    map: ringTexture,
    color: 0xf0d8aa,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.rotation.x = Math.PI / 2;
  ring.rotation.z = 0.28;
  return ring;
}

function createRingTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 32;
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, "rgba(255, 240, 214, 0)");
  gradient.addColorStop(0.16, "rgba(255, 230, 188, 0.35)");
  gradient.addColorStop(0.42, "rgba(222, 190, 134, 0.82)");
  gradient.addColorStop(0.66, "rgba(255, 236, 198, 0.55)");
  gradient.addColorStop(1, "rgba(255, 240, 214, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < 90; index += 1) {
    context.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.18})`;
    context.fillRect(Math.random() * canvas.width, 0, Math.random() * 6 + 1, canvas.height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createGlowTexture(innerColor, outerColor) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(128, 128, 12, 128, 128, 128);
  gradient.addColorStop(0, innerColor);
  gradient.addColorStop(0.35, outerColor);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function setPointerFromEvent(event) {
  const bounds = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
}

function getPlanetFromPointer() {
  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObjects(planetEntries.map((entry) => entry.mesh), false);

  if (intersections.length === 0) {
    return null;
  }

  const clickedMesh = intersections[0].object;
  return planetEntries.find((entry) => entry.mesh === clickedMesh) ?? null;
}

function focusOnPlanet(entry) {
  selectedPlanetEntry = entry;
  selectedPlanetEntry.mesh.getWorldPosition(selectedWorldPosition);
  focusOffset.copy(selectedWorldPosition).normalize().multiplyScalar(entry.config.radius * 4.2 + 10);
  focusOffset.y += entry.config.radius * 1.5 + 2.4;
  controls.minDistance = Math.max(entry.config.radius * 2.6, 5);
  controls.maxDistance = entry.config.radius * 11 + 18;
  updateInfoPanel(entry.config);
  infoPanel.classList.add("is-visible");
  infoPanel.setAttribute("aria-hidden", "false");
  lastInteractionTime = window.performance.now();
}

function clearPlanetFocus() {
  selectedPlanetEntry = null;
  controls.minDistance = OVERVIEW_MIN_DISTANCE;
  controls.maxDistance = OVERVIEW_MAX_DISTANCE;
  infoPanel.classList.remove("is-visible");
  infoPanel.setAttribute("aria-hidden", "true");
  lastInteractionTime = window.performance.now();
}

function updateInfoPanel(config) {
  planetName.textContent = config.name;
  planetTagline.textContent = config.tagline;
  planetDiameter.textContent = config.diameter;
  planetDistance.textContent = config.distance;
  planetSpeed.textContent = config.orbitPace;
  planetFact.textContent = config.funFact;
}

function syncCameraTargets() {
  if (selectedPlanetEntry) {
    selectedPlanetEntry.mesh.getWorldPosition(selectedWorldPosition);
    desiredLookAt.copy(selectedWorldPosition);

    if (userIsControlling) {
      focusOffset.copy(camera.position).sub(selectedWorldPosition);
    }

    desiredCameraPosition.copy(selectedWorldPosition).add(focusOffset);
    return;
  }

  idleDrift.set(0, Math.sin(window.performance.now() * 0.00035) * 0.4, 0);
  desiredCameraPosition.copy(DEFAULT_CAMERA_POSITION).add(idleDrift);
  desiredLookAt.copy(DEFAULT_LOOK_AT);
}

function updateAutoRotate(now) {
  controls.autoRotate = !selectedPlanetEntry && !userIsControlling && now - lastInteractionTime > IDLE_AUTOROTATE_DELAY;
}

function updatePlanetHighlights(deltaTime) {
  planetEntries.forEach((entry) => {
    const isSelected = entry === selectedPlanetEntry;
    const isHovered = entry === hoveredPlanetEntry;
    const targetScale = isSelected ? 1.14 : isHovered ? 1.06 : 1;
    const targetEmissive = isSelected ? 0.22 : isHovered ? 0.13 : 0.09;
    const material = entry.mesh.material;

    entry.mesh.scale.lerp(tempVector.setScalar(targetScale), Math.min(1, deltaTime * 6));
    material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity ?? 0.09, targetEmissive, Math.min(1, deltaTime * 8));
  });
}

function animatePlanets(deltaTime) {
  planetEntries.forEach((entry) => {
    entry.orbitGroup.rotation.y += deltaTime * entry.config.orbitSpeed * 0.22;
    entry.mesh.rotation.y += deltaTime * entry.config.rotationSpeed;
  });

  starfieldGroup.rotation.y += deltaTime * 0.004;
  starfieldGroup.rotation.x = Math.sin(clock.elapsedTime * 0.03) * 0.06;
}

function render() {
  const deltaTime = Math.min(clock.getDelta(), 0.05);
  const now = window.performance.now();

  animatePlanets(deltaTime);
  syncCameraTargets();
  updatePlanetHighlights(deltaTime);
  updateAutoRotate(now);

  if (!userIsControlling || !selectedPlanetEntry) {
    camera.position.lerp(desiredCameraPosition, CAMERA_LERP);
  }

  controls.target.lerp(desiredLookAt, TARGET_LERP);
  controls.update();

  renderer.render(scene, camera);
}
