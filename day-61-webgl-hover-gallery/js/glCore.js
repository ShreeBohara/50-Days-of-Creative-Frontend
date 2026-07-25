/* glCore.js — thin WebGL1 utilities: context creation, shader compile /
 * program link (with uniform-location caching), the shared unit quad,
 * texture upload, and DPR-aware resize.
 */

/* Every uniform any program might use. Locations are looked up per
 * program; missing ones are null, and WebGL ignores uniform calls with
 * a null location — so the renderer can set the full list every draw
 * without caring which effect is active. */
export const UNIFORM_NAMES = [
  "u_rect", "u_texture", "u_uvScale", "u_uvOffset", "u_ratio",
  "u_mouse", "u_hover", "u_sinceEnter", "u_time", "u_velocity", "u_invert",
];

export function createContext(canvas) {
  const attrs = {
    alpha: true,                  // paper background shows through
    antialias: false,             // axis-aligned quads — MSAA buys nothing
    preserveDrawingBuffer: true,  // screenshots after manual step() must work
    premultipliedAlpha: true,
  };
  try {
    return (
      canvas.getContext("webgl", attrs) ||
      canvas.getContext("experimental-webgl", attrs)
    );
  } catch {
    return null;
  }
}

export function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`shader compile failed: ${log}`);
  }
  return shader;
}

/* Link a program and cache its uniform locations. a_position is force-
 * bound to attribute 0 BEFORE linking so the one quad VBO setup serves
 * every program without rebinding attributes on switch. */
export function buildProgram(gl, vertexSrc, fragmentSrc) {
  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexSrc));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentSrc));
  gl.bindAttribLocation(program, 0, "a_position");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`program link failed: ${gl.getProgramInfoLog(program)}`);
  }
  const u = {};
  for (const name of UNIFORM_NAMES) {
    u[name] = gl.getUniformLocation(program, name);
  }
  return { program, u };
}

/* One unit quad in [0,1]^2, two triangles. Bound once; attribute 0 is
 * shared by every program (see buildProgram). */
export function createQuad(gl) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  return buffer;
}

/* Upload a (canvas) source once. CLAMP_TO_EDGE also absorbs displaced
 * UVs that effects push outside [0,1] — the edge smear is intentional. */
export function createTextureFrom(gl, source) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  return texture;
}

/* Match the backing store to CSS size × capped DPR. Returns false when
 * the canvas has no size yet (hidden preview tab) — skip the draw. */
export function resizeToDisplay(gl, canvas, maxDpr = 2) {
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const w = Math.floor(canvas.clientWidth * dpr);
  const h = Math.floor(canvas.clientHeight * dpr);
  if (!w || !h) return false;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  gl.viewport(0, 0, w, h);
  return true;
}
