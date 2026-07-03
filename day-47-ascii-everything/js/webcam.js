// webcam source — getUserMedia behind an explicit consent button.
// Nothing leaves the page: frames go straight into the sampling canvas.

import { setSource, getSource } from './engine.js';
import { getMode } from './main.js';

const notice = document.getElementById('webcam-notice');
const enableBtn = document.getElementById('webcam-enable');
const errorEl = document.getElementById('webcam-error');

const video = document.createElement('video');
video.playsInline = true;
video.muted = true;

let stream = null;

const webcamSource = {
  drawable: video,
  width: () => video.videoWidth,
  height: () => video.videoHeight,
  mirror: true,
};

async function enable() {
  errorEl.hidden = true;
  enableBtn.disabled = true;
  enableBtn.textContent = 'REQUESTING…';
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    notice.hidden = true;
    if (getMode() === 'webcam') setSource(webcamSource);
  } catch (err) {
    errorEl.hidden = false;
    errorEl.textContent =
      err.name === 'NotAllowedError'
        ? '// PERMISSION DENIED — that is fine. The demo scene keeps running; flip back to [ DEMO ] or grant access to try again.'
        : `// NO SIGNAL — ${err.name === 'NotFoundError' ? 'no camera found on this device.' : 'camera could not start.'} The demo scene still works.`;
  } finally {
    enableBtn.disabled = false;
    enableBtn.textContent = 'ENABLE CAMERA';
  }
}

function release() {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
  stream = null;
  video.srcObject = null;
}

enableBtn.addEventListener('click', enable);

document.addEventListener('modechange', ({ detail }) => {
  if (detail.mode === 'webcam') {
    if (stream) {
      setSource(webcamSource);
      notice.hidden = true;
    } else {
      notice.hidden = false; // consent gate: never auto-request the camera
    }
  } else {
    notice.hidden = true;
    // leaving webcam mode releases the hardware — no hot mic/camera anxiety
    if (getSource() === webcamSource || stream) release();
  }
});
