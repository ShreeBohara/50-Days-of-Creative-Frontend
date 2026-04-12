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

  /* ─── Simple Syntax Highlighting (placeholder — enhanced in Part 3) ─── */
  function updateHighlight() {
    if (!highlightCode || !codeEditor) return;
    // For now, just mirror the text (no coloring yet)
    highlightCode.textContent = codeEditor.value;
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
