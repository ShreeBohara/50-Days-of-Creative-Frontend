/* ===================================================================
   Day 20 — WebGL Shader Playground
   Live GLSL editor with real-time WebGL rendering
   =================================================================== */

;(function () {
  'use strict';

  /* ─── DOM References ─── */
  const $ = (sel) => document.querySelector(sel);
  const codeEditor     = $('#code-editor');
  const lineNumbers    = $('#line-numbers');
  const highlightCode  = $('#highlight-code');
  const editorWrap     = $('#editor-wrap');
  const editorLayers   = codeEditor ? codeEditor.parentElement : null;

  /* ─── Shader Presets ─── */
  const PRESETS = {};

  /* Preset 1 — Plasma Waves: sin/cos interference patterns with rich color */
  PRESETS.plasma = `precision mediump float;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * 0.5;

  // Multi-layered plasma interference
  float v1 = sin(uv.x * 10.0 + t);
  float v2 = sin(10.0 * (uv.x * sin(t / 2.0) + uv.y * cos(t / 3.0)) + t);
  float cx = uv.x + 0.5 * sin(t / 5.0);
  float cy = uv.y + 0.5 * cos(t / 3.0);
  float v3 = sin(sqrt(100.0 * (cx * cx + cy * cy) + 1.0) + t);

  // Mouse influence
  float md = length(uv - u_mouse) * 4.0;
  float v4 = sin(md * 8.0 - t * 2.0);

  float v = v1 + v2 + v3 + v4;

  // Vibrant color palette
  vec3 col;
  col.r = sin(v * 3.14159) * 0.5 + 0.5;
  col.g = sin(v * 3.14159 + 2.094) * 0.5 + 0.5;
  col.b = sin(v * 3.14159 + 4.188) * 0.5 + 0.5;

  // Boost saturation
  col = pow(col, vec3(0.85));

  gl_FragColor = vec4(col, 1.0);
}`;

  /* Preset 2 — Mandelbrot Fractal: smooth coloring with zoom */
  PRESETS.fractal = `precision mediump float;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

  // Zoom and pan — mouse controls center
  float zoom = 2.5 - sin(u_time * 0.08) * 1.2;
  vec2 center = mix(vec2(-0.745, 0.186), (u_mouse - 0.5) * 2.0, 0.3);
  vec2 c = uv * zoom + center;
  vec2 z = vec2(0.0);

  float iter = 0.0;
  const float MAX_ITER = 128.0;

  for (float i = 0.0; i < 128.0; i++) {
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    if (dot(z, z) > 4.0) break;
    iter++;
  }

  // Smooth iteration count
  float mu = iter - log2(log2(dot(z, z))) + 4.0;
  float t = mu / MAX_ITER;

  // Vibrant color palette with time cycling
  float phase = u_time * 0.15;
  vec3 col;
  col.r = 0.5 + 0.5 * cos(6.28318 * (t * 1.5 + 0.0 + phase));
  col.g = 0.5 + 0.5 * cos(6.28318 * (t * 1.5 + 0.33 + phase));
  col.b = 0.5 + 0.5 * cos(6.28318 * (t * 1.5 + 0.67 + phase));

  // Black for set interior
  if (iter >= MAX_ITER - 1.0) col = vec3(0.0);

  gl_FragColor = vec4(col, 1.0);
}`;

  /* Preset 3 — Raymarched Sphere: sphere with Phong lighting & soft shadows */
  PRESETS.raymarching = `precision mediump float;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;

float sdSphere(vec3 p, float r) { return length(p) - r; }

float sdPlane(vec3 p) { return p.y + 1.0; }

float scene(vec3 p) {
  float d = sdSphere(p - vec3(0.0, sin(u_time) * 0.3, 0.0), 1.0);
  d = min(d, sdPlane(p));
  return d;
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.001, 0.0);
  return normalize(vec3(
    scene(p + e.xyy) - scene(p - e.xyy),
    scene(p + e.yxy) - scene(p - e.yxy),
    scene(p + e.yyx) - scene(p - e.yyx)
  ));
}

float softShadow(vec3 ro, vec3 rd, float k) {
  float res = 1.0;
  float t = 0.1;
  for (int i = 0; i < 32; i++) {
    float d = scene(ro + rd * t);
    res = min(res, k * d / t);
    if (d < 0.001) return 0.0;
    t += d;
  }
  return clamp(res, 0.0, 1.0);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;

  // Camera
  vec3 ro = vec3(0.0, 0.5, 3.5);
  vec3 rd = normalize(vec3(uv, -1.5));

  // Light position follows mouse
  vec3 lightPos = vec3((u_mouse.x - 0.5) * 6.0, 3.0 + u_mouse.y * 2.0, 2.0);

  // Raymarching
  float t = 0.0;
  for (int i = 0; i < 80; i++) {
    vec3 p = ro + rd * t;
    float d = scene(p);
    if (d < 0.001 || t > 20.0) break;
    t += d;
  }

  vec3 col = vec3(0.05, 0.05, 0.12); // background

  if (t < 20.0) {
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);
    vec3 l = normalize(lightPos - p);

    // Phong shading
    float diff = max(dot(n, l), 0.0);
    vec3 h = normalize(l - rd);
    float spec = pow(max(dot(n, h), 0.0), 32.0);
    float sha = softShadow(p + n * 0.01, l, 16.0);

    // Material color
    vec3 matCol = p.y > -0.99
      ? vec3(0.4, 0.6, 1.0)  // sphere: blue
      : vec3(0.15 + 0.05 * mod(floor(p.x) + floor(p.z), 2.0)); // checker floor

    col = matCol * (0.15 + diff * sha * 0.85) + vec3(1.0) * spec * sha * 0.6;

    // Fog
    col = mix(col, vec3(0.05, 0.05, 0.12), 1.0 - exp(-0.04 * t * t));
  }

  // Gamma
  col = pow(col, vec3(0.4545));
  gl_FragColor = vec4(col, 1.0);
}`;

  /* Preset 4 — Voronoi Cells: animated diagram with distance coloring */
  PRESETS.voronoi = `precision mediump float;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;

vec2 random2(vec2 p) {
  return fract(sin(vec2(
    dot(p, vec2(127.1, 311.7)),
    dot(p, vec2(269.5, 183.3))
  )) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 st = uv * 6.0;
  vec2 ip = floor(st);
  vec2 fp = fract(st);

  float minDist = 10.0;
  float secondDist = 10.0;
  vec2 minPoint = vec2(0.0);

  // Search 3x3 neighborhood
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 point = random2(ip + neighbor);
      point = 0.5 + 0.5 * sin(u_time * 0.8 + 6.28 * point);
      vec2 diff = neighbor + point - fp;
      float d = length(diff);
      if (d < minDist) {
        secondDist = minDist;
        minDist = d;
        minPoint = point;
      } else if (d < secondDist) {
        secondDist = d;
      }
    }
  }

  // Edge detection
  float edge = secondDist - minDist;

  // Coloring
  float hue = fract(minPoint.x * 3.14 + minPoint.y * 2.71 + u_time * 0.05);
  vec3 col;
  col.r = 0.5 + 0.4 * cos(6.28 * (hue + 0.0));
  col.g = 0.5 + 0.4 * cos(6.28 * (hue + 0.33));
  col.b = 0.5 + 0.4 * cos(6.28 * (hue + 0.67));

  // Darken edges
  col *= smoothstep(0.0, 0.08, edge);

  // Mouse glow
  float mouseDist = length(uv - u_mouse);
  col += vec3(0.1, 0.05, 0.2) * exp(-mouseDist * 4.0);

  gl_FragColor = vec4(col, 1.0);
}`;

  /* Preset 5 — Simplex Noise Terrain Flyover: faux-3D height-mapped landscape */
  PRESETS.noise = `precision mediump float;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;

// Simple hash-based noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  vec2 shift = vec2(100.0);
  for (int i = 0; i < 6; i++) {
    v += a * noise(p);
    p = p * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;

  // Perspective transformation for 3D-like flyover
  float py = max(uv.y, 0.001);
  float depth = 1.0 / py;
  float px = (uv.x - 0.5) * depth;

  // Scrolling terrain
  vec2 terrain = vec2(px * 3.0, depth * 2.0 - u_time * 0.6);
  float h = fbm(terrain);

  // Height-based coloring (water → sand → grass → rock → snow)
  vec3 col;
  float waterLevel = u_mouse.y * 0.3 + 0.25;
  if (h < waterLevel) {
    col = mix(vec3(0.05, 0.1, 0.3), vec3(0.1, 0.3, 0.6), h / waterLevel);
  } else if (h < 0.45) {
    col = vec3(0.76, 0.7, 0.5); // sand
  } else if (h < 0.62) {
    col = mix(vec3(0.2, 0.5, 0.15), vec3(0.1, 0.35, 0.1), (h - 0.45) / 0.17);
  } else if (h < 0.78) {
    col = mix(vec3(0.4, 0.35, 0.3), vec3(0.5, 0.45, 0.4), (h - 0.62) / 0.16);
  } else {
    col = mix(vec3(0.6, 0.6, 0.6), vec3(1.0), (h - 0.78) / 0.22);
  }

  // Distance fog
  float fog = 1.0 - exp(-0.15 * depth);
  vec3 skyCol = mix(vec3(0.5, 0.7, 1.0), vec3(0.1, 0.15, 0.4), uv.y);

  // Sky above horizon
  if (uv.y > 0.85) {
    col = skyCol;
  } else {
    col = mix(col, skyCol, fog);
  }

  // Sun
  float sun = smoothstep(0.05, 0.0, length(uv - vec2(0.7, 0.92)));
  col += vec3(1.0, 0.9, 0.7) * sun * 2.0;

  gl_FragColor = vec4(col, 1.0);
}`;

  const DEFAULT_SHADER = PRESETS.plasma;

  /* ─── Preset Switcher ─── */
  const presetSelect = $('#preset-select');

  function loadPreset(name) {
    if (!PRESETS[name] || !codeEditor) return;
    codeEditor.value = PRESETS[name];
    onEditorInput();
    // Immediate compile (bypass debounce)
    clearTimeout(compileTimer);
    compileCurrentShader();
  }

  function initPresetSwitcher() {
    if (!presetSelect) return;
    presetSelect.addEventListener('change', () => {
      loadPreset(presetSelect.value);
    });
  }

  /* ─── Line Numbers ─── */
  function updateLineNumbers() {
    if (!codeEditor || !lineNumbers) return;
    const lines = codeEditor.value.split('\n');
    const count = lines.length;
    let html = '';
    for (let i = 1; i <= count; i++) {
      html += `<div class="ln">${i}</div>`;
    }
    lineNumbers.innerHTML = html;
  }

  /* ─── Sync Scroll between editor and line numbers ─── */
  function syncScroll() {
    if (!codeEditor || !lineNumbers) return;
    lineNumbers.scrollTop = codeEditor.scrollTop;
  }

  /* ─── Tab Key Handling ─── */
  function handleKeyDown(e) {
    const textarea = e.target;
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end   = textarea.selectionEnd;
      const val   = textarea.value;

      if (e.shiftKey) {
        // Shift-Tab: unindent
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        const lineText  = val.substring(lineStart, end);
        if (lineText.startsWith('  ')) {
          textarea.value = val.substring(0, lineStart) + lineText.substring(2);
          textarea.selectionStart = Math.max(start - 2, lineStart);
          textarea.selectionEnd   = Math.max(end - 2, lineStart);
        }
      } else {
        // Tab: insert 2 spaces
        textarea.value = val.substring(0, start) + '  ' + val.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }
      onEditorInput();
    }

    // Auto-close brackets/parens
    const pairs = { '(': ')', '[': ']', '{': '}' };
    if (pairs[e.key]) {
      const start = textarea.selectionStart;
      const end   = textarea.selectionEnd;
      const val   = textarea.value;
      e.preventDefault();
      textarea.value = val.substring(0, start) + e.key + pairs[e.key] + val.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 1;
      onEditorInput();
    }

    // Enter: auto-indent
    if (e.key === 'Enter') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const val   = textarea.value;
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      const currentLine = val.substring(lineStart, start);
      const indent = currentLine.match(/^(\s*)/)[1];
      // Add extra indent if line ends with {
      const extra = currentLine.trimEnd().endsWith('{') ? '  ' : '';
      const insertion = '\n' + indent + extra;
      textarea.value = val.substring(0, start) + insertion + val.substring(start);
      textarea.selectionStart = textarea.selectionEnd = start + insertion.length;
      onEditorInput();
    }
  }

  /* ─── Editor Input Handler ─── */
  let compileTimer = null;
  const DEBOUNCE_MS = 300;

  function onEditorInput() {
    updateLineNumbers();
    syncScroll();
    updateHighlight();

    // Debounced shader recompilation
    clearTimeout(compileTimer);
    compileTimer = setTimeout(() => {
      compileCurrentShader();
    }, DEBOUNCE_MS);
  }

  /* ─── GLSL Syntax Highlighting ─── */

  // Token categories with CSS class names
  const GLSL_TYPES = new Set([
    'void','bool','int','uint','float','double',
    'vec2','vec3','vec4','dvec2','dvec3','dvec4',
    'bvec2','bvec3','bvec4','ivec2','ivec3','ivec4','uvec2','uvec3','uvec4',
    'mat2','mat3','mat4','mat2x2','mat2x3','mat2x4','mat3x2','mat3x3','mat3x4','mat4x2','mat4x3','mat4x4',
    'sampler1D','sampler2D','sampler3D','samplerCube','sampler2DShadow',
    'sampler1DShadow','samplerCubeShadow',
    'isampler2D','usampler2D',
  ]);

  const GLSL_KEYWORDS = new Set([
    'attribute','const','uniform','varying','layout',
    'centroid','flat','smooth','noperspective',
    'break','continue','do','for','while','switch','case','default',
    'if','else','in','out','inout',
    'return','discard',
    'lowp','mediump','highp','precision',
    'struct','invariant','buffer','shared',
  ]);

  const GLSL_BUILTINS = new Set([
    'radians','degrees','sin','cos','tan','asin','acos','atan',
    'sinh','cosh','tanh','asinh','acosh','atanh',
    'pow','exp','log','exp2','log2','sqrt','inversesqrt',
    'abs','sign','floor','ceil','fract','mod','modf',
    'min','max','clamp','mix','step','smoothstep',
    'length','distance','dot','cross','normalize','faceforward',
    'reflect','refract','matrixCompMult','outerProduct','transpose','determinant','inverse',
    'lessThan','lessThanEqual','greaterThan','greaterThanEqual','equal','notEqual',
    'any','all','not','texture','texture2D','textureCube','texture2DProj','textureLod',
    'textureGrad','textureProj','textureSize','texelFetch',
    'dFdx','dFdy','fwidth',
    'gl_FragCoord','gl_FragColor','gl_Position','gl_PointSize','gl_FrontFacing',
    'gl_PointCoord','gl_FragData','gl_FragDepth',
    'main',
  ]);

  /**
   * Escapes HTML special chars to prevent XSS in the highlight layer.
   */
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Tokenizes and highlights GLSL source code.
   * Returns HTML string with <span class="hl-*"> wrappers.
   */
  function highlightGLSL(source) {
    // Regex-based tokenizer — order matters
    const tokenRe = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|#\s*\w+|[0-9]*\.[0-9]+(?:[eE][+-]?[0-9]+)?|[0-9]+\.?(?:[eE][+-]?[0-9]+)?|[a-zA-Z_]\w*|[{}()\[\];,=+\-*/<>!&|^~?:%.]|\S/g;

    let result = '';
    let lastIndex = 0;
    let match;

    while ((match = tokenRe.exec(source)) !== null) {
      // Preserve whitespace between tokens
      if (match.index > lastIndex) {
        result += escapeHtml(source.substring(lastIndex, match.index));
      }
      lastIndex = match.index + match[0].length;

      const tok = match[0];

      if (tok.startsWith('//') || tok.startsWith('/*')) {
        result += `<span class="hl-comment">${escapeHtml(tok)}</span>`;
      } else if (tok.startsWith('#')) {
        result += `<span class="hl-preproc">${escapeHtml(tok)}</span>`;
      } else if (/^[0-9]/.test(tok) || /^\.[0-9]/.test(tok)) {
        result += `<span class="hl-number">${escapeHtml(tok)}</span>`;
      } else if (GLSL_TYPES.has(tok)) {
        result += `<span class="hl-type">${escapeHtml(tok)}</span>`;
      } else if (GLSL_KEYWORDS.has(tok)) {
        result += `<span class="hl-keyword">${escapeHtml(tok)}</span>`;
      } else if (GLSL_BUILTINS.has(tok)) {
        result += `<span class="hl-builtin">${escapeHtml(tok)}</span>`;
      } else {
        result += escapeHtml(tok);
      }
    }

    // Remaining text
    if (lastIndex < source.length) {
      result += escapeHtml(source.substring(lastIndex));
    }

    return result;
  }

  function updateHighlight() {
    if (!highlightCode || !codeEditor) return;
    highlightCode.innerHTML = highlightGLSL(codeEditor.value);
  }

  /* ─── Initialize Editor ─── */
  function initEditor() {
    if (!codeEditor) return;
    codeEditor.value = DEFAULT_SHADER;
    updateLineNumbers();
    updateHighlight();

    codeEditor.addEventListener('input', onEditorInput);
    codeEditor.addEventListener('scroll', syncScroll);
    codeEditor.addEventListener('keydown', handleKeyDown);

    // Also sync the highlight layer scroll
    if (editorLayers) {
      codeEditor.addEventListener('scroll', () => {
        const pre = editorLayers.querySelector('.highlight-layer');
        if (pre) {
          pre.scrollTop  = codeEditor.scrollTop;
          pre.scrollLeft = codeEditor.scrollLeft;
        }
      });
    }
  }

  /* ─── Divider Drag ─── */
  const divider    = $('#divider');
  const panelEditor = $('#panel-editor');
  const panels     = $('#panels');

  let isDragging = false;

  function initDivider() {
    if (!divider || !panelEditor || !panels) return;

    divider.addEventListener('mousedown', startDrag);
    divider.addEventListener('touchstart', startDrag, { passive: false });

    function startDrag(e) {
      e.preventDefault();
      isDragging = true;
      divider.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onDrag);
      document.addEventListener('touchmove', onDrag, { passive: false });
      document.addEventListener('mouseup', stopDrag);
      document.addEventListener('touchend', stopDrag);
    }

    function onDrag(e) {
      if (!isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const rect = panels.getBoundingClientRect();
      const ratio = (clientX - rect.left) / rect.width;
      const clamped = Math.max(0.2, Math.min(0.8, ratio));
      panelEditor.style.flex = `0 0 ${clamped * 100}%`;
    }

    function stopDrag() {
      isDragging = false;
      divider.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('touchmove', onDrag);
      document.removeEventListener('mouseup', stopDrag);
      document.removeEventListener('touchend', stopDrag);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     WebGL Engine
     ═══════════════════════════════════════════════════════════════════ */

  const glCanvas      = $('#gl-canvas');
  let gl              = null;
  let currentProgram  = null;
  let quadVAO         = null;
  let quadVBO         = null;
  let startTime       = performance.now() / 1000;
  let mouseX = 0.5, mouseY = 0.5;

  /* Passthrough vertex shader — just draws the full-screen quad */
  const VERTEX_SHADER_SRC = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  /**
   * Initialize WebGL context and create the full-screen quad geometry.
   */
  function initWebGL() {
    if (!glCanvas) return false;

    gl = glCanvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: false })
      || glCanvas.getContext('experimental-webgl');

    if (!gl) {
      console.error('WebGL not supported');
      return false;
    }

    // Full-screen quad: two triangles covering clip-space [-1, 1]
    const vertices = new Float32Array([
      -1, -1,   1, -1,   -1,  1,
      -1,  1,   1, -1,    1,  1,
    ]);

    quadVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Track mouse on canvas
    glCanvas.addEventListener('mousemove', (e) => {
      const r = glCanvas.getBoundingClientRect();
      mouseX = (e.clientX - r.left) / r.width;
      mouseY = 1.0 - (e.clientY - r.top) / r.height; // flip Y for GL
    });

    resizeCanvas();
    return true;
  }

  /**
   * Resize the WebGL canvas to match its CSS layout size.
   */
  function resizeCanvas() {
    if (!glCanvas || !gl) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = glCanvas.getBoundingClientRect();
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (glCanvas.width !== w || glCanvas.height !== h) {
      glCanvas.width = w;
      glCanvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  /**
   * Compile a shader of the given type from source.
   * Returns the compiled shader or null on error.
   */
  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      return { error: info };
    }
    return { shader };
  }

  /**
   * Build a shader program from the user's fragment shader source.
   * Returns { program } on success or { error } on failure.
   */
  function buildProgram(fragSource) {
    const vs = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    if (vs.error) return { error: 'Vertex shader error:\n' + vs.error };

    const fs = compileShader(gl.FRAGMENT_SHADER, fragSource);
    if (fs.error) {
      gl.deleteShader(vs.shader);
      return { error: fs.error };
    }

    const program = gl.createProgram();
    gl.attachShader(program, vs.shader);
    gl.attachShader(program, fs.shader);
    gl.linkProgram(program);

    // Shaders no longer needed once linked
    gl.deleteShader(vs.shader);
    gl.deleteShader(fs.shader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      return { error: 'Link error:\n' + info };
    }

    return { program };
  }

  /* ─── Error / Compile Status UI ─── */
  const errorOverlay = $('#error-overlay');
  const errorMessage = $('#error-message');
  const compileStatus = $('#compile-status');

  function showError(msg) {
    if (errorOverlay) { errorOverlay.hidden = false; }
    if (errorMessage) { errorMessage.textContent = msg; }
    if (compileStatus) {
      compileStatus.textContent = '● Error';
      compileStatus.className = 'compile-badge compile-badge--error';
    }
  }

  function clearError() {
    if (errorOverlay) { errorOverlay.hidden = true; }
    if (compileStatus) {
      compileStatus.textContent = '● Compiled';
      compileStatus.className = 'compile-badge compile-badge--ok';
    }
  }

  /**
   * Attempt to compile the current editor's shader and make it active.
   */
  function compileCurrentShader() {
    if (!gl || !codeEditor) return;
    const source = codeEditor.value;
    const result = buildProgram(source);

    if (result.error) {
      showError(result.error);
      return;
    }

    // Success: swap programs
    if (currentProgram) gl.deleteProgram(currentProgram);
    currentProgram = result.program;
    clearError();
  }

  /**
   * Render a single frame.
   */
  function renderFrame() {
    if (!gl || !currentProgram) return;

    resizeCanvas();

    gl.useProgram(currentProgram);

    // Pass uniforms
    const uTime = gl.getUniformLocation(currentProgram, 'u_time');
    const uRes  = gl.getUniformLocation(currentProgram, 'u_resolution');
    const uMouse = gl.getUniformLocation(currentProgram, 'u_mouse');

    const now = performance.now() / 1000 - startTime;
    if (uTime)  gl.uniform1f(uTime, now);
    if (uRes)   gl.uniform2f(uRes, glCanvas.width, glCanvas.height);
    if (uMouse) gl.uniform2f(uMouse, mouseX, mouseY);

    // Draw quad
    const aPos = gl.getAttribLocation(currentProgram, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /* ─── Animation Loop ─── */
  let animId = null;

  function loop() {
    renderFrame();
    animId = requestAnimationFrame(loop);
  }

  /* ─── Boot ─── */
  function init() {
    initEditor();
    initDivider();
    initPresetSwitcher();

    if (initWebGL()) {
      compileCurrentShader();
      loop();
    }

    window.addEventListener('resize', resizeCanvas);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
