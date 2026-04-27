import { motion } from 'framer-motion';
import { usePlayer } from '../context/PlayerContext';
import { formatTime } from '../data/songs';
import WaveformProgress from '../components/WaveformProgress';
import LikeButton from '../components/LikeButton';
import {
  ChevronDown, Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1,
} from 'lucide-react';
import './NowPlayingView.css';

export default function NowPlayingView() {
  const { state, dispatch, startAudio, stopAudio } = usePlayer();
  const { currentTrack, isPlaying, elapsed, shuffle, repeat } = state;

  if (!currentTrack) return null;

  const handleClose = () => {
    dispatch({ type: 'GO_BACK' });
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopAudio();
      dispatch({ type: 'PAUSE' });
    } else {
      startAudio(currentTrack.freq || 220);
      dispatch({ type: 'PLAY' });
    }
  };

  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;

  return (
    <motion.div
      className="now-playing-overlay"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
    >
      {/* Blurred background */}
      <div
        className="np-bg"
        style={{
          background: `${currentTrack.album?.gradient || 'var(--bg-base)'}`,
        }}
      />
      <div className="np-bg-overlay" />

      {/* Content */}
      <div className="np-content">
        {/* Header */}
        <div className="np-header">
          <button className="np-close-btn" onClick={handleClose} aria-label="Minimize">
            <ChevronDown size={28} />
          </button>
          <span className="np-header-title">Now Playing</span>
          <div style={{ width: 28 }} />
        </div>

        {/* Album Art with Vinyl */}
        <div className="np-art-container">
          <div className={`np-vinyl ${isPlaying ? 'spinning' : ''}`}>
            <div className="np-vinyl-grooves" />
            <div
              className="np-vinyl-label"
              style={{ background: currentTrack.album?.gradient }}
            />
          </div>
          <motion.div
            className={`np-album-art ${isPlaying ? 'spinning' : ''}`}
            style={{ background: currentTrack.album?.gradient }}
            layoutId={`np-album-art`}
          />
        </div>

        {/* Song Info */}
        <div className="np-song-info">
          <div className="np-song-text">
            <h2 className="np-song-title text-display">{currentTrack.title}</h2>
            <p className="np-song-artist">{currentTrack.artist}</p>
          </div>
          <LikeButton songId={currentTrack.id} size={24} />
        </div>

        {/* Waveform */}
        <div className="np-waveform">
          <WaveformProgress />
          <div className="np-time-row">
            <span>{formatTime(elapsed)}</span>
            <span>{formatTime(currentTrack.duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="np-controls">
          <button
            className={`np-ctrl-btn ${shuffle ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'TOGGLE_SHUFFLE' })}
          >
            <Shuffle size={22} />
          </button>
          <button className="np-ctrl-btn" onClick={() => dispatch({ type: 'PREV' })}>
            <SkipBack size={28} fill="currentColor" />
          </button>
          <motion.button
            className="np-play-btn"
            onClick={handleTogglePlay}
            whileTap={{ scale: 0.9 }}
          >
            {isPlaying
              ? <Pause size={32} fill="black" color="black" />
              : <Play size={32} fill="black" color="black" />
            }
          </motion.button>
          <button className="np-ctrl-btn" onClick={() => dispatch({ type: 'NEXT' })}>
            <SkipForward size={28} fill="currentColor" />
          </button>
          <button
            className={`np-ctrl-btn ${repeat !== 'off' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'TOGGLE_REPEAT' })}
          >
            <RepeatIcon size={22} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
