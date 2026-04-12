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

  /* ─── Default shader placeholder ─── */
  const DEFAULT_SHADER = `precision mediump float;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec3 col = 0.5 + 0.5 * cos(u_time + uv.xyx + vec3(0, 2, 4));
  gl_FragColor = vec4(col, 1.0);
}`;

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
  function onEditorInput() {
    updateLineNumbers();
    syncScroll();
    updateHighlight();
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

  /* ─── Boot ─── */
  function init() {
    initEditor();
    initDivider();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
