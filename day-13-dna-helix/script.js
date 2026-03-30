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

/* ── Base-Pair Sequence ─────────────────────────────────── */
const PAIR_TYPES = ["AT", "TA", "GC", "CG"];
const sequence = [];
for (let i = 0; i < NUM_PAIRS; i++) {
  sequence.push(PAIR_TYPES[Math.floor(Math.random() * 4)]);
}

/* ── Nucleotide Colors ──────────────────────────────────── */
const NUC_COLORS = {
  A: new THREE.Color(0x4a9eff),
  T: new THREE.Color(0xffd54f),
  G: new THREE.Color(0xff5252),
  C: new THREE.Color(0x69f0ae),
};

const NUC_NAMES = {
  A: "Adenine",
  T: "Thymine",
  G: "Guanine",
  C: "Cytosine",
};

/* ── Base-Pair Connectors + Nucleotide Spheres ──────────── */
const connectorGeo = new THREE.CylinderGeometry(0.06, 0.06, 1, 8);
const sphereGeo = new THREE.SphereGeometry(0.22, 16, 12);

const connectors = [];
const nucleotides = [];

for (let i = 0; i < NUM_PAIRS; i++) {
  const t = (i + 0.5) / NUM_PAIRS;
  const p1 = getHelixPoint(t, 0);
  const p2 = getHelixPoint(t, Math.PI);

  const pair = sequence[i];
  const nuc1 = pair[0];
  const nuc2 = pair[1];
  const col1 = NUC_COLORS[nuc1];
  const col2 = NUC_COLORS[nuc2];

  const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const len = dir.length();

  const connectorColor = new THREE.Color().lerpColors(col1, col2, 0.5);
  const connMat = new THREE.MeshStandardMaterial({
    color: connectorColor,
    emissive: connectorColor,
    emissiveIntensity: 0.1,
    roughness: 0.5,
    metalness: 0.2,
  });

  const cyl = new THREE.Mesh(connectorGeo, connMat);
  cyl.position.copy(mid);
  cyl.scale.y = len;
  cyl.lookAt(p2);
  cyl.rotateX(Math.PI / 2);

  cyl.userData = {
    pairIndex: i,
    pairType: pair,
    strand1Pos: p1.clone(),
    strand2Pos: p2.clone(),
  };

  connectors.push(cyl);
  helixGroup.add(cyl);

  /* Nucleotide spheres at each endpoint */
  const mat1 = new THREE.MeshStandardMaterial({
    color: col1,
    emissive: col1,
    emissiveIntensity: 0.15,
    roughness: 0.35,
    metalness: 0.1,
  });
  const sphere1 = new THREE.Mesh(sphereGeo, mat1);
  sphere1.position.copy(p1);
  sphere1.userData = {
    pairIndex: i,
    pairType: pair,
    nucleotide: nuc1,
    strand1Pos: p1.clone(),
    strand2Pos: p2.clone(),
  };
  nucleotides.push(sphere1);
  helixGroup.add(sphere1);

  const mat2 = new THREE.MeshStandardMaterial({
    color: col2,
    emissive: col2,
    emissiveIntensity: 0.15,
    roughness: 0.35,
    metalness: 0.1,
  });
  const sphere2 = new THREE.Mesh(sphereGeo, mat2);
  sphere2.position.copy(p2);
  sphere2.userData = {
    pairIndex: i,
    pairType: pair,
    nucleotide: nuc2,
    strand1Pos: p1.clone(),
    strand2Pos: p2.clone(),
  };
  nucleotides.push(sphere2);
  helixGroup.add(sphere2);
}

/* ── Raycasting & Click Interaction ──────────────────────── */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerDown = new THREE.Vector2();
let selectedPairIndex = -1;

const infoPanel = document.getElementById("info-panel");
const infoBadge = document.getElementById("info-badge");
const infoPos = document.getElementById("info-pos");
const infoNuc1 = document.getElementById("info-nuc1");
const infoNuc2 = document.getElementById("info-nuc2");
const infoBond = document.getElementById("info-bond");
const infoClose = document.getElementById("info-close");
const sequenceBar = document.getElementById("sequence-bar");

/* Build sequence bar dots */
for (let i = 0; i < NUM_PAIRS; i++) {
  const dot = document.createElement("div");
  dot.className = "seq-dot";
  const pair = sequence[i];
  const col = NUC_COLORS[pair[0]];
  dot.style.color = `#${col.getHexString()}`;
  dot.style.background = `#${col.getHexString()}`;
  dot.dataset.index = i;
  dot.addEventListener("click", () => selectPair(i));
  sequenceBar.appendChild(dot);
}

function highlightPair(index) {
  /* Reset previous */
  unhighlightAll();

  if (index < 0 || index >= NUM_PAIRS) return;

  /* Highlight connector */
  const conn = connectors[index];
  conn.material.emissiveIntensity = 0.8;

  /* Highlight nucleotide spheres */
  const s1 = nucleotides[index * 2];
  const s2 = nucleotides[index * 2 + 1];
  s1.material.emissiveIntensity = 0.7;
  s2.material.emissiveIntensity = 0.7;
  s1.scale.setScalar(1.4);
  s2.scale.setScalar(1.4);

  /* Sequence bar */
  const dots = sequenceBar.querySelectorAll(".seq-dot");
  dots.forEach((d, i) => d.classList.toggle("active", i === index));
}

function unhighlightAll() {
  connectors.forEach((c) => { c.material.emissiveIntensity = 0.1; });
  nucleotides.forEach((s) => {
    s.material.emissiveIntensity = 0.15;
    s.scale.setScalar(1);
  });
  const dots = sequenceBar.querySelectorAll(".seq-dot");
  dots.forEach((d) => d.classList.remove("active"));
}

function selectPair(index) {
  if (index === selectedPairIndex) {
    deselectPair();
    return;
  }
  selectedPairIndex = index;
  highlightPair(index);

  const pair = sequence[index];
  const nuc1 = pair[0];
  const nuc2 = pair[1];
  const bonds = (nuc1 === "G" || nuc1 === "C") ? 3 : 2;

  infoBadge.textContent = `${nuc1} — ${nuc2}`;
  infoPos.textContent = `Position #${index + 1}`;
  infoNuc1.textContent = `${NUC_NAMES[nuc1]} (${nuc1})`;
  infoNuc2.textContent = `${NUC_NAMES[nuc2]} (${nuc2})`;
  infoBond.textContent = `Hydrogen (${bonds})`;

  infoPanel.classList.remove("hidden");
}

function deselectPair() {
  selectedPairIndex = -1;
  unhighlightAll();
  infoPanel.classList.add("hidden");
}

infoClose.addEventListener("click", deselectPair);

/* Pointer events for raycasting */
canvas.addEventListener("pointerdown", (e) => {
  pointerDown.set(e.clientX, e.clientY);
});

canvas.addEventListener("pointerup", (e) => {
  const dx = e.clientX - pointerDown.x;
  const dy = e.clientY - pointerDown.y;
  if (Math.sqrt(dx * dx + dy * dy) > 5) return; /* was a drag */

  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(nucleotides);

  if (hits.length > 0) {
    selectPair(hits[0].object.userData.pairIndex);
  } else {
    deselectPair();
  }
});

/* ── Auto-Rotation ──────────────────────────────────────── */
let autoRotate = true;
let isInteracting = false;

controls.addEventListener("start", () => { isInteracting = true; });
controls.addEventListener("end", () => { isInteracting = false; });

const btnRotate = document.getElementById("btn-rotate");
btnRotate.addEventListener("click", () => {
  autoRotate = !autoRotate;
  btnRotate.classList.toggle("active", autoRotate);
});

/* ── Animation Loop ─────────────────────────────────────── */
function animate() {
  requestAnimationFrame(animate);

  if (autoRotate && !isInteracting) {
    helixGroup.rotation.y += 0.003;
  }

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
