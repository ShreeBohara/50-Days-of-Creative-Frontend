// Look-dev materials. The Blender glTFs ship the baked textures; everything
// here re-dresses them in three.js physical terms: a milky clearcoated glaze,
// grainy clay fracture faces, the crack-race line, and the seam ribbon whose
// per-seam state (lacquer fill → gold coverage → polish) lives in one small
// float DataTexture so painting never touches geometry.

import * as THREE from 'three'

const lin = (hex) => new THREE.Color(hex) // THREE.Color converts sRGB hex → linear working space

export const PALETTE = {
  urushi: lin('#7a1e12'),
  urushiWet: lin('#8a2716'),
  goldMatte: lin('#c9a24f'),
  goldPolished: lin('#ffd489'),
  crack: lin('#2a1c14'),
  clay: lin('#b88a63'),
}

/** Upgrade the glTF glaze into a MeshPhysicalMaterial with a milky clearcoat. */
export function makeCeramic(src) {
  const m = new THREE.MeshPhysicalMaterial({
    map: src.map,
    normalMap: src.normalMap,
    roughnessMap: src.roughnessMap,
    roughness: 1,
    metalness: 0,
    clearcoat: 0.5,
    clearcoatRoughness: 0.24,
    sheen: 0.35,
    sheenColor: new THREE.Color('#fff1e0'),
    sheenRoughness: 0.55,
    envMapIntensity: 1,
  })
  if (src.normalScale) m.normalScale.copy(src.normalScale)
  for (const t of [m.map, m.normalMap, m.roughnessMap]) if (t) t.anisotropy = 8
  m.name = 'ceramic'
  // A soft wrap term on the diffuse lobe reads as light scattering inside a
  // thick feldspar glaze (the "milk" in shino) instead of hard Lambert falloff.
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <normal_fragment_maps>',
        // The lathe's poles (centre of the well, centre of the foot) have
        // degenerate UV derivatives, so the derived tangent frame is NaN there
        // and bloom turns the pixel into a cyan star. Fall back to the mesh normal.
        `#include <normal_fragment_maps>
        if (any(isnan(normal)) || any(isinf(normal))) normal = nonPerturbedNormal;`,
      )
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        reflectedLight.indirectDiffuse += diffuseColor.rgb * 0.045;`,
      )
  }
  return m
}

let clayTex = null
function clayGrain() {
  if (clayTex) return clayTex
  const n = 128
  const data = new Uint8Array(n * n * 4)
  // cheap value-noise speckle: fired stoneware is gritty, with dark iron flecks
  let s = 1234567
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < n * n; i++) {
    const g = 0.86 + rnd() * 0.18 - (rnd() < 0.04 ? 0.35 : 0)
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = Math.max(0, Math.min(255, g * 255))
    data[i * 4 + 3] = 255
  }
  clayTex = new THREE.DataTexture(data, n, n)
  clayTex.wrapS = clayTex.wrapT = THREE.RepeatWrapping
  clayTex.repeat.set(3, 3)
  clayTex.magFilter = THREE.LinearFilter
  clayTex.minFilter = THREE.LinearMipmapLinearFilter
  clayTex.generateMipmaps = true
  clayTex.needsUpdate = true
  return clayTex
}

export function makeFracture() {
  const tex = clayGrain()
  const m = new THREE.MeshStandardMaterial({
    color: PALETTE.clay,
    map: tex,
    bumpMap: tex,
    bumpScale: 1.2,
    roughness: 0.93,
    metalness: 0,
  })
  m.name = 'fracture'
  return m
}

/**
 * Ribbon vertex patch shared by the crack line and the seam: the geometry
 * stores the crack's centre line; width and lift are applied here.
 */
const RIBBON_VERTEX_PARS = /* glsl */ `
attribute float aSeam;
attribute float aArc;
attribute float aImpact;
attribute float aTaper;
attribute vec3 aOffset;
uniform float uWidth;
uniform float uLift;
varying float vSeam;
varying float vArc;
varying float vImpact;
`
const RIBBON_VERTEX_BEGIN = /* glsl */ `
vec3 transformed = position + normal * uLift + aOffset * (uWidth * aTaper);
vSeam = aSeam;
vArc = aArc;
vImpact = aImpact;
`

/** The crack race: a dark hairline that grows outward from the impact point. */
export function makeCrackMaterial() {
  const uniforms = {
    uWidth: { value: 0.00032 },
    uLift: { value: 0.00012 },
    uFront: { value: 0 },
  }
  const m = new THREE.MeshBasicMaterial({ color: PALETTE.crack, transparent: true, depthWrite: false })
  m.polygonOffset = true
  m.polygonOffsetFactor = -2
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${RIBBON_VERTEX_PARS}`)
      .replace('#include <begin_vertex>', RIBBON_VERTEX_BEGIN)
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uFront;
        varying float vImpact;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float ahead = vImpact - uFront;
        if (ahead > 0.0) discard;
        // the newest millimetres of crack flash pale before settling dark
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.9, 0.82), smoothstep(-0.004, 0.0, ahead) * 0.6);
        diffuseColor.a *= 0.92;`,
      )
  }
  m.userData.uniforms = uniforms
  return m
}

/**
 * Lacquer → gold → burnish, per seam. uState texel i = (fill m, gold 0..1,
 * polish 0..1, wet 0..1). Gold arrives patchily (a hash threshold along the
 * seam) so dust visibly accumulates rather than switching on.
 */
export function makeSeamMaterial(stateTexture, count) {
  const uniforms = {
    uWidth: { value: 0.00085 },
    uLift: { value: 0.00016 },
    uState: { value: stateTexture },
    uCount: { value: count },
    uUrushi: { value: PALETTE.urushi },
    uGoldMatte: { value: PALETTE.goldMatte },
    uGoldPolished: { value: PALETTE.goldPolished },
  }
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.2,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.25,
  })
  m.polygonOffset = true
  m.polygonOffsetFactor = -3
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${RIBBON_VERTEX_PARS}`)
      .replace('#include <begin_vertex>', RIBBON_VERTEX_BEGIN)
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D uState;
        uniform float uCount;
        uniform vec3 uUrushi;
        uniform vec3 uGoldMatte;
        uniform vec3 uGoldPolished;
        varying float vSeam;
        varying float vArc;
        float seamHash(float x) { return fract(sin(x * 127.1 + 311.7) * 43758.5453); }
        float seamNoise(float x) {
          float i = floor(x); float f = fract(x);
          return mix(seamHash(i), seamHash(i + 1.0), f * f * (3.0 - 2.0 * f));
        }
        vec4 seamState() { return texture2D(uState, vec2((vSeam + 0.5) / uCount, 0.5)); }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec4 st = seamState();
        if (vArc > st.r) discard;
        float n = seamNoise(vArc * 900.0) * 0.6 + seamNoise(vArc * 3100.0 + 7.0) * 0.4;
        float g = smoothstep(n - 0.06, n + 0.06, st.g);
        float wetEdge = smoothstep(0.0025, 0.0, st.r - vArc) * st.a;
        vec3 gold = mix(uGoldMatte, uGoldPolished, st.b);
        diffuseColor.rgb = mix(uUrushi * (1.0 + wetEdge * 0.35), gold, g);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(0.16 - wetEdge * 0.08, mix(0.62, 0.14, st.b), g);`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
        metalnessFactor = g;`,
      )
      .replace(
        '#include <lights_physical_fragment>',
        `#include <lights_physical_fragment>
        material.clearcoat *= (1.0 - g);`,
      )
  }
  m.userData.uniforms = uniforms
  return m
}
