/* ── Day 07 · Fluid Simulation ──
 *  Real-time 2D fluid dynamics with GPU-accelerated
 *  Navier-Stokes solver running in WebGL fragment shaders.
 */

'use strict';

/* ═══════════════════════════════════════════
   DOM refs
   ═══════════════════════════════════════════ */
const canvas = document.querySelector('[data-fluid-canvas]');
const hero   = document.querySelector('[data-hero]');
const viscositySlider  = document.querySelector('[data-viscosity]');
const diffusionSlider  = document.querySelector('[data-diffusion]');
const viscosityValue   = document.querySelector('[data-viscosity-value]');
const diffusionValue   = document.querySelector('[data-diffusion-value]');
const clearBtn         = document.querySelector('[data-clear]');
const randomSplatsBtn  = document.querySelector('[data-random-splats]');

/* ═══════════════════════════════════════════
   WebGL 2 context
   ═══════════════════════════════════════════ */
function resizeCanvas() {
  canvas.width  = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
resizeCanvas();

const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: false });
if (!gl) {
  document.body.innerHTML = '<p style="color:#e8e6f0;text-align:center;padding:4rem;font-family:system-ui">WebGL 2 is not supported on this browser.</p>';
}

/* Enable float texture rendering */
const extFloat = gl.getExtension('EXT_color_buffer_float');
const extHalfFloat = gl.getExtension('EXT_color_buffer_half_float');

/* ═══════════════════════════════════════════
   Simulation config
   ═══════════════════════════════════════════ */
const SIM_RES  = 256;   // simulation grid resolution
const DYE_RES  = 1024;  // dye rendering resolution (higher = prettier)
const JACOBI_ITERATIONS = 20;

const config = {
  viscosity: 0.3,
  dyeDissipation: 0.985,
  velocityDissipation: 0.98,
  pressureDissipation: 0.8,
  splatRadius: 0.3,
  splatForce: 6000,
  dt: 1 / 60,
};

/* ═══════════════════════════════════════════
   Shader sources
   ═══════════════════════════════════════════ */
const VERT_SHARED = `#version 300 es
precision highp float;
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAG_ADVECTION = `#version 300 es
precision highp float;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexelSize;
uniform float uDt;
uniform float uDissipation;
in vec2 vUv;
out vec4 fragColor;
void main() {
  vec2 vel = texture(uVelocity, vUv).xy;
  vec2 coord = vUv - uDt * vel * uTexelSize;
  fragColor = uDissipation * texture(uSource, coord);
}
`;

const FRAG_JACOBI = `#version 300 es
precision highp float;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexelSize;
in vec2 vUv;
out vec4 fragColor;
void main() {
  float L = texture(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
  float B = texture(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
  float T = texture(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
  float div = texture(uDivergence, vUv).x;
  fragColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
}
`;

const FRAG_DIVERGENCE = `#version 300 es
precision highp float;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;
in vec2 vUv;
out vec4 fragColor;
void main() {
  float L = texture(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).x;
  float B = texture(uVelocity, vUv - vec2(0.0, uTexelSize.y)).y;
  float T = texture(uVelocity, vUv + vec2(0.0, uTexelSize.y)).y;
  fragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}
`;

const FRAG_GRADIENT_SUBTRACT = `#version 300 es
precision highp float;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;
in vec2 vUv;
out vec4 fragColor;
void main() {
  float L = texture(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
  float B = texture(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
  float T = texture(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
  vec2 vel = texture(uVelocity, vUv).xy;
  vel -= vec2(R - L, T - B) * 0.5;
  fragColor = vec4(vel, 0.0, 1.0);
}
`;

const FRAG_SPLAT = `#version 300 es
precision highp float;
uniform sampler2D uTarget;
uniform vec2 uPoint;
uniform vec3 uColor;
uniform float uRadius;
uniform float uAspect;
in vec2 vUv;
out vec4 fragColor;
void main() {
  vec2 p = vUv - uPoint;
  p.x *= uAspect;
  float d = dot(p, p);
  vec3 splat = exp(-d / uRadius) * uColor;
  vec3 base = texture(uTarget, vUv).xyz;
  fragColor = vec4(base + splat, 1.0);
}
`;

const FRAG_DISPLAY = `#version 300 es
precision highp float;
uniform sampler2D uTexture;
in vec2 vUv;
out vec4 fragColor;
void main() {
  vec3 col = texture(uTexture, vUv).rgb;
  /* Slight tone-mapping: boost brightness, subtle vignette */
  col = pow(col, vec3(0.85));
  float vig = 1.0 - 0.25 * dot(vUv - 0.5, vUv - 0.5);
  col *= vig;
  /* Deep background tint so empty areas aren't pure black */
  col += vec3(0.012, 0.008, 0.035) * (1.0 - min(length(col), 1.0));
  fragColor = vec4(col, 1.0);
}
`;

const FRAG_CLEAR = `#version 300 es
precision highp float;
uniform sampler2D uTexture;
uniform float uValue;
in vec2 vUv;
out vec4 fragColor;
void main() {
  fragColor = uValue * texture(uTexture, vUv);
}
`;

/* ═══════════════════════════════════════════
   Shader compilation helpers
   ═══════════════════════════════════════════ */
function compileShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(vertSrc, fragSrc) {
  const vert = compileShader(gl.VERTEX_SHADER, vertSrc);
  const frag = compileShader(gl.FRAGMENT_SHADER, fragSrc);
  const prog = gl.createProgram();
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(prog));
    return null;
  }
  return prog;
}

/* Wrap a program with a uniform cache for convenient use */
function createMaterial(vertSrc, fragSrc) {
  const program = createProgram(vertSrc, fragSrc);
  const uniforms = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    uniforms[info.name] = gl.getUniformLocation(program, info.name);
  }
  return { program, uniforms };
}

/* ═══════════════════════════════════════════
   Compile all shader programs
   ═══════════════════════════════════════════ */
const programs = {
  advection:        createMaterial(VERT_SHARED, FRAG_ADVECTION),
  jacobi:           createMaterial(VERT_SHARED, FRAG_JACOBI),
  divergence:       createMaterial(VERT_SHARED, FRAG_DIVERGENCE),
  gradientSubtract: createMaterial(VERT_SHARED, FRAG_GRADIENT_SUBTRACT),
  splat:            createMaterial(VERT_SHARED, FRAG_SPLAT),
  display:          createMaterial(VERT_SHARED, FRAG_DISPLAY),
  clear:            createMaterial(VERT_SHARED, FRAG_CLEAR),
};

/* ═══════════════════════════════════════════
   Fullscreen quad geometry
   ═══════════════════════════════════════════ */
const quadVAO = gl.createVertexArray();
const quadVBO = gl.createBuffer();
gl.bindVertexArray(quadVAO);
gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  -1, -1,  1, -1,  -1, 1,
  -1,  1,  1, -1,   1, 1,
]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
gl.bindVertexArray(null);

/* ═══════════════════════════════════════════
   Framebuffer object helpers
   ═══════════════════════════════════════════ */
function createFBO(w, h, internalFormat, format, type, filter) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    console.warn('FBO incomplete, status:', status);
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { texture, fbo, width: w, height: h };
}

function createDoubleFBO(w, h, internalFormat, format, type, filter) {
  let read  = createFBO(w, h, internalFormat, format, type, filter);
  let write = createFBO(w, h, internalFormat, format, type, filter);
  return {
    get read()  { return read; },
    get write() { return write; },
    swap() { const tmp = read; read = write; write = tmp; },
  };
}

/* ═══════════════════════════════════════════
   Create simulation FBOs
   ═══════════════════════════════════════════ */
const simTexelSize = [1.0 / SIM_RES, 1.0 / SIM_RES];
const dyeTexelSize = [1.0 / DYE_RES, 1.0 / DYE_RES];

const halfFloat = gl.HALF_FLOAT;
const rgba16f   = gl.RGBA16F;
const rg16f     = gl.RG16F;
const r16f      = gl.R16F;

let velocity   = createDoubleFBO(SIM_RES, SIM_RES, rg16f,   gl.RG,   halfFloat, gl.LINEAR);
let pressure   = createDoubleFBO(SIM_RES, SIM_RES, r16f,    gl.RED,  halfFloat, gl.NEAREST);
let divergenceFBO = createFBO(SIM_RES, SIM_RES,    r16f,    gl.RED,  halfFloat, gl.NEAREST);
let dye        = createDoubleFBO(DYE_RES, DYE_RES, rgba16f, gl.RGBA, halfFloat, gl.LINEAR);

/* ═══════════════════════════════════════════
   Blit helper — draw fullscreen quad to target
   ═══════════════════════════════════════════ */
function blit(target) {
  if (target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    gl.viewport(0, 0, target.width, target.height);
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  gl.bindVertexArray(quadVAO);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.bindVertexArray(null);
}

/* ═══════════════════════════════════════════
   Advection step
   ═══════════════════════════════════════════ */
function advect(velocityField, sourceField, targetField, texelSize, dissipation) {
  const { program, uniforms } = programs.advection;
  gl.useProgram(program);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, velocityField.read.texture);
  gl.uniform1i(uniforms.uVelocity, 0);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, sourceField.read.texture);
  gl.uniform1i(uniforms.uSource, 1);

  gl.uniform2fv(uniforms.uTexelSize, texelSize);
  gl.uniform1f(uniforms.uDt, config.dt);
  gl.uniform1f(uniforms.uDissipation, dissipation);

  blit(targetField.write);
  targetField.swap();
}

/* ═══════════════════════════════════════════
   Divergence
   ═══════════════════════════════════════════ */
function computeDivergence() {
  const { program, uniforms } = programs.divergence;
  gl.useProgram(program);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
  gl.uniform1i(uniforms.uVelocity, 0);
  gl.uniform2fv(uniforms.uTexelSize, simTexelSize);

  blit(divergenceFBO);
}

/* ═══════════════════════════════════════════
   Clear / dissipation pass
   ═══════════════════════════════════════════ */
function clearField(target, value) {
  const { program, uniforms } = programs.clear;
  gl.useProgram(program);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, target.read.texture);
  gl.uniform1i(uniforms.uTexture, 0);
  gl.uniform1f(uniforms.uValue, value);

  blit(target.write);
  target.swap();
}

/* ═══════════════════════════════════════════
   Pressure solve (Jacobi iterations)
   ═══════════════════════════════════════════ */
function solvePressure() {
  const { program, uniforms } = programs.jacobi;
  gl.useProgram(program);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, divergenceFBO.texture);
  gl.uniform1i(uniforms.uDivergence, 1);
  gl.uniform2fv(uniforms.uTexelSize, simTexelSize);

  for (let i = 0; i < JACOBI_ITERATIONS; i++) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pressure.read.texture);
    gl.uniform1i(uniforms.uPressure, 0);

    blit(pressure.write);
    pressure.swap();
  }
}

/* ═══════════════════════════════════════════
   Gradient subtraction
   ═══════════════════════════════════════════ */
function subtractGradient() {
  const { program, uniforms } = programs.gradientSubtract;
  gl.useProgram(program);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, pressure.read.texture);
  gl.uniform1i(uniforms.uPressure, 0);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
  gl.uniform1i(uniforms.uVelocity, 1);

  gl.uniform2fv(uniforms.uTexelSize, simTexelSize);

  blit(velocity.write);
  velocity.swap();
}

/* ═══════════════════════════════════════════
   Splat — inject velocity or dye at a point
   ═══════════════════════════════════════════ */
function splat(target, x, y, dx, dy, color, radius) {
  const { program, uniforms } = programs.splat;
  gl.useProgram(program);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, target.read.texture);
  gl.uniform1i(uniforms.uTarget, 0);

  gl.uniform2f(uniforms.uPoint, x, y);
  gl.uniform3f(uniforms.uColor, color[0], color[1], color[2]);
  gl.uniform1f(uniforms.uRadius, radius);
  gl.uniform1f(uniforms.uAspect, canvas.width / canvas.height);

  blit(target.write);
  target.swap();
}

/* ═══════════════════════════════════════════
   Pointer / touch input
   ═══════════════════════════════════════════ */
const pointer = {
  down: false,
  x: 0, y: 0,
  prevX: 0, prevY: 0,
  dx: 0, dy: 0,
  moved: false,
};

const splatQueue = [];

canvas.addEventListener('pointerdown', (e) => {
  pointer.down = true;
  pointer.x = e.offsetX;
  pointer.y = e.offsetY;
  pointer.prevX = pointer.x;
  pointer.prevY = pointer.y;
  /* Hide hero text on first interaction */
  if (hero) hero.classList.add('hidden');
});

canvas.addEventListener('pointermove', (e) => {
  pointer.prevX = pointer.x;
  pointer.prevY = pointer.y;
  pointer.x = e.offsetX;
  pointer.y = e.offsetY;
  pointer.dx = pointer.x - pointer.prevX;
  pointer.dy = pointer.y - pointer.prevY;
  pointer.moved = true;

  if (pointer.down) {
    splatQueue.push({
      x: pointer.x / canvas.clientWidth,
      y: 1.0 - pointer.y / canvas.clientHeight,
      dx: pointer.dx,
      dy: -pointer.dy,
    });
  }
});

window.addEventListener('pointerup', () => { pointer.down = false; });

/* ═══════════════════════════════════════════
   HSL → RGB conversion for dye color cycling
   ═══════════════════════════════════════════ */
function hslToRgb(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}

function getTimeColor() {
  const hue = (performance.now() * 0.0001) % 1.0;
  return hslToRgb(hue, 1.0, 0.5);
}

/* ═══════════════════════════════════════════
   Process splats
   ═══════════════════════════════════════════ */
function processSplats() {
  while (splatQueue.length > 0) {
    const s = splatQueue.pop();
    const force = config.splatForce;
    const color = getTimeColor();
    splat(velocity, s.x, s.y, s.dx, s.dy,
      [s.dx * force, s.dy * force, 0],
      config.splatRadius / 100);
    splat(dye, s.x, s.y, s.dx, s.dy,
      [color[0] * 0.6, color[1] * 0.6, color[2] * 0.6],
      config.splatRadius / 100);
  }
}

/* ═══════════════════════════════════════════
   Animation loop
   ═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   Clear all fields
   ═══════════════════════════════════════════ */
function clearAll() {
  clearField(velocity, 0);
  clearField(pressure, 0);
  clearField(dye, 0);
}

/* ═══════════════════════════════════════════
   Random splats burst
   ═══════════════════════════════════════════ */
function randomSplats(count) {
  for (let i = 0; i < count; i++) {
    const x = Math.random();
    const y = Math.random();
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 200;
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed;
    const color = hslToRgb(Math.random(), 1.0, 0.5);
    splat(velocity, x, y, 0, 0,
      [dx, dy, 0],
      config.splatRadius / 100);
    splat(dye, x, y, 0, 0,
      [color[0] * 0.5, color[1] * 0.5, color[2] * 0.5],
      config.splatRadius / 100);
  }
}

/* ═══════════════════════════════════════════
   Wire up control panel
   ═══════════════════════════════════════════ */
viscositySlider.addEventListener('input', () => {
  config.viscosity = viscositySlider.value / 100;
  viscosityValue.textContent = config.viscosity.toFixed(1);
});

diffusionSlider.addEventListener('input', () => {
  /* Map 0–100 to dissipation 0.95–1.0 (higher slider = more dye retention) */
  config.dyeDissipation = 0.95 + (diffusionSlider.value / 100) * 0.05;
  diffusionValue.textContent = (diffusionSlider.value / 100).toFixed(1);
});

clearBtn.addEventListener('click', clearAll);
randomSplatsBtn.addEventListener('click', () => randomSplats(Math.floor(5 + Math.random() * 6)));

/* Fire initial random splats so the canvas isn't empty */
randomSplats(6);

/* ═══════════════════════════════════════════
   Animation loop
   ═══════════════════════════════════════════ */
function step() {
  /* 0. Process queued mouse splats */
  processSplats();

  /* 1. Advect velocity through itself */
  advect(velocity, velocity, velocity, simTexelSize, config.velocityDissipation);

  /* 2. Pressure projection */
  computeDivergence();
  clearField(pressure, config.pressureDissipation);
  solvePressure();
  subtractGradient();

  /* 3. Advect dye through velocity field */
  advect(velocity, dye, dye, dyeTexelSize, config.dyeDissipation);

  /* 4. Render dye color field to screen */
  const { program, uniforms } = programs.display;
  gl.useProgram(program);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, dye.read.texture);
  gl.uniform1i(uniforms.uTexture, 0);
  blit(null);

  requestAnimationFrame(step);
}

requestAnimationFrame(step);
