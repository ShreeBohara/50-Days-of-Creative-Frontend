import { usePlayer } from '../context/PlayerContext';
import { formatTime } from '../data/songs';
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1,
  Volume2, Volume1, VolumeX,
} from 'lucide-react';
import WaveformProgress from './WaveformProgress';
import './PlayerBar.css';

export default function PlayerBar() {
  const { state, dispatch, startAudio, stopAudio } = usePlayer();
  const { currentTrack, isPlaying, elapsed, volume, shuffle, repeat } = state;

  const handleTogglePlay = () => {
    if (!currentTrack) return;
    if (isPlaying) {
      stopAudio();
      dispatch({ type: 'PAUSE' });
    } else {
      startAudio(currentTrack.freq || 220);
      dispatch({ type: 'PLAY' });
    }
  };

  const handleNext = () => dispatch({ type: 'NEXT' });
  const handlePrev = () => dispatch({ type: 'PREV' });
  const handleShuffle = () => dispatch({ type: 'TOGGLE_SHUFFLE' });
  const handleRepeat = () => dispatch({ type: 'TOGGLE_REPEAT' });
  const handleVolumeChange = (e) => {
    dispatch({ type: 'SET_VOLUME', payload: parseFloat(e.target.value) });
  };

  const handleExpandNowPlaying = () => {
    if (currentTrack) {
      dispatch({ type: 'SET_VIEW', payload: { view: 'nowplaying' } });
    }
  };

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;

  return (
    <div className="player-bar">
      {/* Left — Song info */}
      <div className="player-left">
        {currentTrack ? (
          <>
            <button
              className={`player-art-btn ${isPlaying ? 'spinning' : ''}`}
              onClick={handleExpandNowPlaying}
              aria-label="Open Now Playing"
            >
              <div
                className="player-art"
                style={{ background: currentTrack.album?.gradient }}
              />
            </button>
            <div className="player-song-info">
              <span className="player-song-title">{currentTrack.title}</span>
              <span className="player-song-artist">{currentTrack.artist}</span>
            </div>
          </>
        ) : (
          <div className="player-empty">
            <div className="player-art-placeholder" />
            <div className="player-song-info">
              <span className="player-song-title empty">No track selected</span>
            </div>
          </div>
        )}
      </div>

      {/* Center — Controls + Progress */}
      <div className="player-center">
        <div className="player-controls">
          <button
            className={`control-btn small ${shuffle ? 'active' : ''}`}
            onClick={handleShuffle}
            aria-label="Shuffle"
          >
            <Shuffle size={18} />
          </button>
          <button className="control-btn small" onClick={handlePrev} aria-label="Previous">
            <SkipBack size={20} fill="currentColor" />
          </button>
          <button
            className="control-btn play-btn"
            onClick={handleTogglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          <button className="control-btn small" onClick={handleNext} aria-label="Next">
            <SkipForward size={20} fill="currentColor" />
          </button>
          <button
            className={`control-btn small ${repeat !== 'off' ? 'active' : ''}`}
            onClick={handleRepeat}
            aria-label="Repeat"
          >
            <RepeatIcon size={18} />
          </button>
        </div>

        <div className="player-progress-row">
          <span className="player-time">{formatTime(elapsed)}</span>
          <WaveformProgress />
          <span className="player-time">{currentTrack ? formatTime(currentTrack.duration) : '0:00'}</span>
        </div>
      </div>

      {/* Right — Volume */}
      <div className="player-right">
        <button
          className="control-btn small"
          onClick={() => dispatch({ type: 'SET_VOLUME', payload: volume === 0 ? 0.7 : 0 })}
          aria-label="Toggle mute"
        >
          <VolumeIcon size={18} />
        </button>
        <div className="volume-slider-container">
          <input
            type="range"
            className="volume-slider"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            aria-label="Volume"
          />
          <div className="volume-fill" style={{ width: `${volume * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
