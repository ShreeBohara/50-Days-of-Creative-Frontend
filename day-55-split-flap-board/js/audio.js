const MAX_VOICES = 40;

function clamp(value, minimum, maximum, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

export function createClackAudio(options = {}) {
  let context = null;
  let compressor = null;
  let masterGain = null;
  let noiseBuffer = null;
  let unlockPromise = null;
  let enabled = false;
  let muted = true;
  let hidden = false;
  let reducedMotion = Boolean(options.reducedMotion);
  let volume = clamp(options.volume, 0, 1, 0.45);
  let activeVoices = 0;

  function snapshot() {
    return {
      enabled,
      muted,
      volume,
      contextState: context?.state ?? "uninitialized",
      active: enabled && !muted && context?.state === "running",
    };
  }

  function notify() {
    options.onStateChange?.(snapshot());
  }

  function createNoiseBuffer(audioContext) {
    const frameCount = Math.ceil(audioContext.sampleRate * 0.034);
    const buffer = audioContext.createBuffer(1, frameCount, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      const decay = 1 - index / data.length;
      data[index] = (Math.random() * 2 - 1) * decay;
    }
    return buffer;
  }

  function applyMasterGain(immediate = false) {
    if (!context || !masterGain) return;
    const now = context.currentTime;
    const target = enabled && !muted ? Math.max(0.0001, volume) : 0.0001;
    masterGain.gain.cancelScheduledValues(now);
    if (immediate) {
      masterGain.gain.setValueAtTime(target, now);
    } else {
      masterGain.gain.setTargetAtTime(target, now, 0.015);
    }
  }

  function buildGraph(audioContext) {
    compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 18;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.002;
    compressor.release.value = 0.08;

    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.0001;
    compressor.connect(masterGain);
    masterGain.connect(audioContext.destination);
    noiseBuffer = createNoiseBuffer(audioContext);
  }

  async function enable() {
    if (enabled && context?.state === "running") {
      muted = false;
      applyMasterGain();
      notify();
      return true;
    }

    if (unlockPromise) return unlockPromise;
    unlockPromise = (async () => {
      try {
        if (!context) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (!AudioContextClass) throw new Error("Web Audio is unavailable");
          context = new AudioContextClass();
          buildGraph(context);
          context.addEventListener("statechange", notify);
        }
        if (context.state !== "running") await context.resume();
        if (context.state !== "running") throw new Error("Audio context is blocked");
        enabled = true;
        muted = false;
        applyMasterGain(true);
        notify();
        return true;
      } catch {
        enabled = false;
        muted = true;
        applyMasterGain(true);
        notify();
        return false;
      } finally {
        unlockPromise = null;
      }
    })();
    return unlockPromise;
  }

  async function toggle() {
    if (!enabled) return enable();

    if (muted && context?.state !== "running") {
      try {
        await context.resume();
      } catch {
        notify();
        return false;
      }
    }
    muted = !muted;
    applyMasterGain();
    notify();
    return !muted;
  }

  function setVolume(nextVolume) {
    volume = clamp(nextVolume, 0, 1, 0.45);
    applyMasterGain();
    notify();
    return volume;
  }

  function clack(metadata = {}) {
    if (
      !enabled
      || muted
      || hidden
      || reducedMotion
      || context?.state !== "running"
      || !noiseBuffer
      || activeVoices >= MAX_VOICES
    ) return false;

    const now = context.currentTime;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const voiceGain = context.createGain();
    const variance = clamp(metadata.variance, 0.9, 1.1, 1);

    source.buffer = noiseBuffer;
    source.playbackRate.value = variance * (0.96 + Math.random() * 0.08);
    filter.type = "bandpass";
    filter.frequency.value = 1500 + Math.random() * 1150 + (metadata.column ?? 0) * 7;
    filter.Q.value = 0.7 + Math.random() * 0.5;
    voiceGain.gain.setValueAtTime(0.0001, now);
    voiceGain.gain.linearRampToValueAtTime(0.085, now + 0.0015);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

    source.connect(filter);
    filter.connect(voiceGain);
    voiceGain.connect(compressor);
    activeVoices += 1;
    source.addEventListener("ended", () => {
      activeVoices = Math.max(0, activeVoices - 1);
      source.disconnect();
      filter.disconnect();
      voiceGain.disconnect();
    }, { once: true });
    source.start(now);
    source.stop(now + 0.034);
    return true;
  }

  function setHidden(nextHidden) {
    hidden = Boolean(nextHidden);
  }

  function setReducedMotion(nextReducedMotion) {
    reducedMotion = Boolean(nextReducedMotion);
  }

  async function destroy() {
    enabled = false;
    muted = true;
    if (context && context.state !== "closed") await context.close();
    context = null;
    compressor = null;
    masterGain = null;
    noiseBuffer = null;
  }

  return {
    enable,
    toggle,
    setVolume,
    setHidden,
    setReducedMotion,
    clack,
    destroy,
    get state() {
      return snapshot();
    },
  };
}
