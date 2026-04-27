import { useMemo, useRef, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import './WaveformProgress.css';

/* Generate deterministic random waveform bars from a seed */
function generateWaveform(seed = 0, count = 80) {
  const bars = [];
  let s = seed || 1;
  for (let i = 0; i < count; i++) {
    s = (s * 16807) % 2147483647;
    const h = 0.2 + ((s % 1000) / 1000) * 0.8;
    bars.push(h);
  }
  return bars;
}

export default function WaveformProgress() {
  const { state, dispatch } = usePlayer();
  const { currentTrack, isPlaying, elapsed } = state;
  const containerRef = useRef(null);
  const animRef = useRef(null);
  const elapsedRef = useRef(elapsed);

  // Keep ref in sync
  elapsedRef.current = elapsed;

  const bars = useMemo(() => {
    if (!currentTrack) return generateWaveform(0);
    const seed = currentTrack.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return generateWaveform(seed);
  }, [currentTrack]);

  const progress = currentTrack ? Math.min(elapsed / currentTrack.duration, 1) : 0;

  // Animation loop for elapsed time
  useEffect(() => {
    if (!isPlaying || !currentTrack) return;

    let lastTimestamp = null;

    const tick = (timestamp) => {
      if (lastTimestamp === null) lastTimestamp = timestamp;
      const delta = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      const newElapsed = elapsedRef.current + delta;
      dispatch({ type: 'SET_ELAPSED', payload: newElapsed });

      if (newElapsed < currentTrack.duration) {
        animRef.current = requestAnimationFrame(tick);
      }
    };

    animRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, currentTrack, dispatch]);

  // Auto-advance when song ends
  useEffect(() => {
    if (currentTrack && elapsed >= currentTrack.duration) {
      dispatch({ type: 'NEXT' });
    }
  }, [elapsed, currentTrack, dispatch]);

  const handleClick = (e) => {
    if (!currentTrack || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    dispatch({ type: 'SET_ELAPSED', payload: x * currentTrack.duration });
  };

  return (
    <div
      className="waveform-container"
      ref={containerRef}
      onClick={handleClick}
      role="slider"
      aria-label="Song progress"
      aria-valuemin={0}
      aria-valuemax={currentTrack?.duration || 0}
      aria-valuenow={Math.floor(elapsed)}
    >
      {bars.map((h, i) => {
        const barProgress = i / bars.length;
        const isFilled = barProgress <= progress;
        return (
          <div
            key={i}
            className={`waveform-bar ${isFilled ? 'filled' : ''}`}
            style={{ height: `${h * 100}%` }}
          />
        );
      })}
    </div>
  );
}
