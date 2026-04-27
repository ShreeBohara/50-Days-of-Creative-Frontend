import { motion } from 'framer-motion';
import { usePlayer } from '../context/PlayerContext';
import { getAlbum, formatTime } from '../data/songs';
import LikeButton from './LikeButton';
import { Play } from 'lucide-react';
import './TrackRow.css';

export default function TrackRow({ song, index, onClick }) {
  const { state } = usePlayer();
  const album = getAlbum(song.albumId);
  const isActive = state.currentTrack?.id === song.id;
  const isPlaying = isActive && state.isPlaying;

  return (
    <motion.div
      className={`track-row ${isActive ? 'active' : ''}`}
      onClick={onClick}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
    >
      <div className="track-num">
        {isPlaying ? (
          <div className="track-eq">
            <span className="eq-bar" /><span className="eq-bar" /><span className="eq-bar" />
          </div>
        ) : (
          <>
            <span className="track-num-text">{index + 1}</span>
            <Play className="track-play-icon" size={14} fill="currentColor" />
          </>
        )}
      </div>

      <div className="track-title-col">
        <div
          className="track-art-mini"
          style={{ background: album?.gradient }}
        />
        <div className="track-title-info">
          <span className={`track-title ${isActive ? 'playing' : ''}`}>{song.title}</span>
          <span className="track-artist">{song.artist}</span>
        </div>
      </div>

      <span className="track-album-name">{album?.title}</span>

      <div className="track-actions">
        <LikeButton songId={song.id} />
        <span className="track-duration">{formatTime(song.duration)}</span>
      </div>
    </motion.div>
  );
}
