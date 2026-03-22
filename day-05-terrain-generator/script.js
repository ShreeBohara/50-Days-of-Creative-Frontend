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

/* ── Terrain Mesh ────────────────────────────────────────── */
function initTerrain() {
  const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, SEGMENTS, SEGMENTS);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.MeshStandardMaterial({
    color: 0x888888,
    flatShading: true,
    vertexColors: false,
  });

  state.terrain = new THREE.Mesh(geo, mat);
  state.scene.add(state.terrain);
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

  window.addEventListener("resize", handleResize);
  animate();
}

init();
