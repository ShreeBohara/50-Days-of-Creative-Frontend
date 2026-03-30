/* ── Day 13 · Interactive DNA Helix ── */
"use strict";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/* ── Renderer ───────────────────────────────────────────── */
const canvas = document.getElementById("dna-canvas");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

/* ── Scene ──────────────────────────────────────────────── */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);
scene.fog = new THREE.FogExp2(0x050510, 0.018);

/* ── Camera ─────────────────────────────────────────────── */
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 5, 18);

/* ── Controls ───────────────────────────────────────────── */
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 6;
controls.maxDistance = 40;
controls.target.set(0, 5, 0);
controls.update();

/* ── Lighting ───────────────────────────────────────────── */
const ambientLight = new THREE.AmbientLight(0x334466, 0.6);
scene.add(ambientLight);

const dirLight1 = new THREE.DirectionalLight(0x00d4ff, 0.8);
dirLight1.position.set(5, 10, 8);
scene.add(dirLight1);

const dirLight2 = new THREE.DirectionalLight(0xff6644, 0.35);
dirLight2.position.set(-6, -4, -5);
scene.add(dirLight2);

/* ── Helix Constants ─────────────────────────────────────── */
const NUM_PAIRS = 36;
const HELIX_RADIUS = 2.0;
const HELIX_HEIGHT = 24;
const HELIX_TURNS = 3.4;
const CURVE_SEGMENTS = 360;

/* ── Helix Group ────────────────────────────────────────── */
const helixGroup = new THREE.Group();
scene.add(helixGroup);

/* ── Backbone Geometry Helpers ───────────────────────────── */
function getHelixPoint(t, phaseOffset) {
  const angle = t * Math.PI * 2 * HELIX_TURNS + phaseOffset;
  const x = Math.cos(angle) * HELIX_RADIUS;
  const y = t * HELIX_HEIGHT;
  const z = Math.sin(angle) * HELIX_RADIUS;
  return new THREE.Vector3(x, y, z);
}

function buildBackboneCurve(phaseOffset) {
  const points = [];
  for (let i = 0; i <= CURVE_SEGMENTS; i++) {
    const t = i / CURVE_SEGMENTS;
    points.push(getHelixPoint(t, phaseOffset));
  }
  return new THREE.CatmullRomCurve3(points);
}

const backboneMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x00d4ff,
  emissive: 0x00d4ff,
  emissiveIntensity: 0.25,
  roughness: 0.3,
  metalness: 0.1,
  transparent: true,
  opacity: 0.75,
  transmission: 0.15,
});

function createBackboneTube(curve) {
  const geo = new THREE.TubeGeometry(curve, 200, 0.12, 8, false);
  const mesh = new THREE.Mesh(geo, backboneMaterial);
  return mesh;
}

const curve1 = buildBackboneCurve(0);
const curve2 = buildBackboneCurve(Math.PI);

const backbone1 = createBackboneTube(curve1);
const backbone2 = createBackboneTube(curve2);
helixGroup.add(backbone1, backbone2);

/* ── Animation Loop ─────────────────────────────────────── */
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

/* ── Resize ─────────────────────────────────────────────── */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
