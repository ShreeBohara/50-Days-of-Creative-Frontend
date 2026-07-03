// image source — drag-and-drop anywhere, or a plain file picker.
// A dropped file switches to image mode on its own; no tab hunting.

import { setSource } from './engine.js';
import { setMode, getMode, toast } from './main.js';

const notice = document.getElementById('image-notice');
const pickBtn = document.getElementById('image-pick');
const fileInput = document.getElementById('image-input');

let img = null; // the last successfully loaded image

const imageSource = {
  drawable: null,
  width: () => (img ? img.naturalWidth : 0),
  height: () => (img ? img.naturalHeight : 0),
};

function loadFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    toast('// NOT AN IMAGE — png, jpg, webp, gif…');
    return;
  }
  const url = URL.createObjectURL(file);
  const next = new Image();
  next.onload = () => {
    URL.revokeObjectURL(url);
    img = next;
    imageSource.drawable = img;
    if (getMode() !== 'image') setMode('image');
    setSource(imageSource);
    notice.hidden = true;
    toast(`// LOADED ${file.name.toUpperCase()}`);
  };
  next.onerror = () => {
    URL.revokeObjectURL(url);
    toast('// DECODE FAILED — try another file');
  };
  next.src = url;
}

pickBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  loadFile(fileInput.files[0]);
  fileInput.value = '';
});

// whole-page drop target with a visible flash while dragging
let dragDepth = 0;
document.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dragDepth++;
  document.body.classList.add('is-dragging');
});
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) document.body.classList.remove('is-dragging');
});
document.addEventListener('drop', (e) => {
  e.preventDefault();
  dragDepth = 0;
  document.body.classList.remove('is-dragging');
  loadFile(e.dataTransfer.files[0]);
});

document.addEventListener('modechange', ({ detail }) => {
  if (detail.mode === 'image') {
    if (img) {
      setSource(imageSource);
      notice.hidden = true;
    } else {
      notice.hidden = false;
    }
  } else {
    notice.hidden = true;
  }
});
