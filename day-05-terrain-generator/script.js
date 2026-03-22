"use strict";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createNoise2D } from "simplex-noise";

/* ── State ───────────────────────────────────────────────── */
const TERRAIN_SIZE = 400;
const SEGMENTS = 200;

const state = {
  renderer: null,
  scene: null,
  camera: null,
  controls: null,
  clock: new THREE.Clock(),
  terrain: null,
  water: null,
  noise2D: null,
  params: {
    seed: "alpine",
    amplitude: 45,
    frequency: 0.012,
    octaves: 6,
    lacunarity: 2.0,
    persistence: 0.5,
    waterLevel: -4,
  },
};

/* ── Renderer ────────────────────────────────────────────── */
function initRenderer() {
  const canvas = document.getElementById("terrain-canvas");
  state.renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  state.renderer.setClearColor(0x0a1628);
  state.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  state.renderer.toneMappingExposure = 1.1;
}

/* ── Scene ───────────────────────────────────────────────── */
function initScene() {
  state.scene = new THREE.Scene();
  state.scene.fog = new THREE.FogExp2(0x0a1628, 0.0025);
}

/* ── Camera ──────────────────────────────────────────────── */
function initCamera() {
  state.camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  state.camera.position.set(0, 80, 120);
  state.camera.lookAt(0, 0, 0);
}

/* ── Controls ────────────────────────────────────────────── */
function initControls() {
  state.controls = new OrbitControls(state.camera, state.renderer.domElement);
  state.controls.enableDamping = true;
  state.controls.dampingFactor = 0.06;
  state.controls.maxPolarAngle = Math.PI / 2.15;
  state.controls.minDistance = 30;
  state.controls.maxDistance = 300;
  state.controls.target.set(0, 0, 0);
}

/* ── Lights ──────────────────────────────────────────────── */
function initLights() {
  const dir = new THREE.DirectionalLight(0xffe4b5, 1.2);
  dir.position.set(-80, 100, 60);
  state.scene.add(dir);

  const amb = new THREE.AmbientLight(0x4488cc, 0.3);
  state.scene.add(amb);

  const hemi = new THREE.HemisphereLight(0x87ceeb, 0x2d5a27, 0.4);
  state.scene.add(hemi);
}

/* ── Noise ───────────────────────────────────────────────── */
function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function seedNoise(seed) {
  const h = hashSeed(seed);
  const rng = seededRandom(Math.abs(h) || 1);
  state.noise2D = createNoise2D(rng);
}

function fbm(x, z, params) {
  let value = 0;
  let amp = params.amplitude;
  let freq = params.frequency;
  for (let i = 0; i < params.octaves; i++) {
    value += state.noise2D(x * freq, z * freq) * amp;
    freq *= params.lacunarity;
    amp *= params.persistence;
  }
  return value;
}

/* ── Height Coloring ─────────────────────────────────────── */
const BIOMES = [
  { t: 0.0,  color: new THREE.Color(0x1a3a5c) }, // deep water
  { t: 0.18, color: new THREE.Color(0x2d7ea8) }, // shallow water
  { t: 0.28, color: new THREE.Color(0xd4b483) }, // sand
  { t: 0.34, color: new THREE.Color(0x4a8c3f) }, // grass
  { t: 0.55, color: new THREE.Color(0x2d5a27) }, // forest
  { t: 0.70, color: new THREE.Color(0x6b6b6b) }, // rock
  { t: 0.85, color: new THREE.Color(0xf0f0f5) }, // snow
];

function biomeColor(t) {
  if (t <= BIOMES[0].t) return BIOMES[0].color.clone();
  if (t >= BIOMES[BIOMES.length - 1].t) return BIOMES[BIOMES.length - 1].color.clone();
  for (let i = 1; i < BIOMES.length; i++) {
    if (t <= BIOMES[i].t) {
      const prev = BIOMES[i - 1];
      const curr = BIOMES[i];
      const f = (t - prev.t) / (curr.t - prev.t);
      return prev.color.clone().lerp(curr.color, f);
    }
  }
  return BIOMES[BIOMES.length - 1].color.clone();
}

function applyVertexColors(geo) {
  const pos = geo.attributes.position;
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const range = maxY - minY || 1;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) - minY) / range;
    const bc = biomeColor(t);
    colors[i * 3] = bc.r;
    colors[i * 3 + 1] = bc.g;
    colors[i * 3 + 2] = bc.b;
  }

  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
}

/* ── Terrain Mesh ────────────────────────────────────────── */
function applyNoiseDisplacement(geo, params) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, fbm(x, z, params));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

function initTerrain() {
  const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, SEGMENTS, SEGMENTS);
  geo.rotateX(-Math.PI / 2);

  seedNoise(state.params.seed);
  applyNoiseDisplacement(geo, state.params);
  applyVertexColors(geo);

  const mat = new THREE.MeshStandardMaterial({
    flatShading: true,
    vertexColors: true,
  });

  state.terrain = new THREE.Mesh(geo, mat);
  state.scene.add(state.terrain);
}

/* ── Water Plane ─────────────────────────────────────────── */
function initWater() {
  const geo = new THREE.PlaneGeometry(TERRAIN_SIZE * 1.2, TERRAIN_SIZE * 1.2, 1, 1);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.MeshStandardMaterial({
    color: 0x2d7ea8,
    transparent: true,
    opacity: 0.55,
    metalness: 0.1,
    roughness: 0.15,
    side: THREE.DoubleSide,
  });

  state.water = new THREE.Mesh(geo, mat);
  state.water.position.y = state.params.waterLevel;
  state.scene.add(state.water);
}

/* ── Terrain Rebuild ─────────────────────────────────────── */
function rebuildTerrain() {
  if (state.terrain) {
    state.terrain.geometry.dispose();
    state.scene.remove(state.terrain);
  }

  const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, SEGMENTS, SEGMENTS);
  geo.rotateX(-Math.PI / 2);

  seedNoise(state.params.seed);
  applyNoiseDisplacement(geo, state.params);
  applyVertexColors(geo);

  const mat = new THREE.MeshStandardMaterial({
    flatShading: true,
    vertexColors: true,
  });

  state.terrain = new THREE.Mesh(geo, mat);
  state.scene.add(state.terrain);
}

/* ── Controls Binding ────────────────────────────────────── */
function bindControls() {
  const ids = ["amplitude", "frequency", "octaves", "waterLevel"];

  ids.forEach((id) => {
    const input = document.getElementById(`ctrl-${id}`);
    const output = document.getElementById(`out-${id}`);
    if (!input) return;

    input.addEventListener("input", () => {
      const val = parseFloat(input.value);
      state.params[id] = val;
      if (output) output.textContent = val;

      if (id === "waterLevel" && state.water) {
        state.water.position.y = val;
      }
    });
  });

  const seedInput = document.getElementById("ctrl-seed");
  if (seedInput) {
    seedInput.addEventListener("change", () => {
      state.params.seed = seedInput.value || "alpine";
    });
  }

  const regenBtn = document.getElementById("btn-regenerate");
  if (regenBtn) {
    regenBtn.addEventListener("click", () => {
      rebuildTerrain();
    });
  }
}

/* ── Resize ──────────────────────────────────────────────── */
function handleResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  state.camera.aspect = w / h;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(w, h);
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

/* ── Animation Loop ──────────────────────────────────────── */
function animate() {
  requestAnimationFrame(animate);
  const t = state.clock.getElapsedTime();

  if (state.water) {
    state.water.position.y = state.params.waterLevel + Math.sin(t * 0.8) * 0.15;
  }

  state.controls.update();
  state.renderer.render(state.scene, state.camera);
}

/* ── Boot ────────────────────────────────────────────────── */
function init() {
  initRenderer();
  initScene();
  initCamera();
  initControls();
  initLights();
  initTerrain();
  initWater();
  bindControls();

  const loadingOverlay = document.getElementById("loading-overlay");
  if (loadingOverlay) {
    requestAnimationFrame(() => loadingOverlay.classList.add("hidden"));
  }

  window.addEventListener("resize", handleResize);
  animate();
}

init();
