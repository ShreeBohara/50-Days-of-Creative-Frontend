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
