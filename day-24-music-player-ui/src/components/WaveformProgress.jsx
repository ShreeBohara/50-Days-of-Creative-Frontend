import { useMemo, useRef, useEffect, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext';
import './WaveformProgress.css';

/* Generate random waveform bars (deterministic per track) */
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
  const lastTimeRef = useRef(null);

  const bars = useMemo(() => {
    if (!currentTrack) return generateWaveform(0);
    // Use song id as seed
    const seed = currentTrack.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return generateWaveform(seed);
  }, [currentTrack]);

  const progress = currentTrack ? Math.min(elapsed / currentTrack.duration, 1) : 0;

  // Animation loop for elapsed time
  const tick = useCallback((timestamp) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const delta = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    dispatch({ type: 'SET_ELAPSED', payload: state.elapsed + delta });
    animRef.current = requestAnimationFrame(tick);
  }, [dispatch, state.elapsed]);

  useEffect(() => {
    if (isPlaying && currentTrack) {
      lastTimeRef.current = null;
      animRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, currentTrack, tick]);

  // Auto-advance when song ends
  useEffect(() => {
    if (currentTrack && elapsed >= currentTrack.duration) {
      dispatch({ type: 'NEXT' });
    }
  }, [elapsed, currentTrack, dispatch]);

  const handleClick = (e) => {
    if (!currentTrack || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
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
