import { motion } from 'framer-motion';
import { usePlayer } from '../context/PlayerContext';
import { getSong, getAlbum, formatTime, getPlaylistDuration } from '../data/songs';
import TrackRow from '../components/TrackRow';
import { Play, ArrowLeft } from 'lucide-react';
import './PlaylistView.css';

export default function PlaylistView() {
  const { state, dispatch } = usePlayer();
  const playlist = state.currentPlaylist;

  if (!playlist) return null;

  const album = getAlbum(playlist.albumId);
  const playlistSongs = playlist.songIds.map(id => getSong(id)).filter(Boolean);
  const totalDuration = getPlaylistDuration(playlist);
  const totalMinutes = Math.floor(totalDuration / 60);

  const handlePlayAll = () => {
    if (playlistSongs.length > 0) {
      dispatch({ type: 'SET_QUEUE', payload: { queue: playlistSongs, index: 0 } });
    }
  };

  const handlePlayTrack = (index) => {
    dispatch({ type: 'SET_QUEUE', payload: { queue: playlistSongs, index } });
  };

  const handleBack = () => {
    dispatch({ type: 'SET_VIEW', payload: { view: 'home' } });
  };

  return (
    <motion.div
      className="playlist-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Gradient header */}
      <div
        className="playlist-header"
        style={{
          background: `linear-gradient(180deg, ${album?.color || '#333'}cc 0%, transparent 100%)`,
        }}
      >
        <button className="playlist-back-btn" onClick={handleBack} aria-label="Go back">
          <ArrowLeft size={24} />
        </button>
        <div className="playlist-header-content">
          <motion.div
            className="playlist-header-art"
            style={{ background: album?.gradient }}
            layoutId={`album-art-${playlist.id}`}
          />
          <div className="playlist-header-info">
            <span className="playlist-label">Playlist</span>
            <h1 className="playlist-title text-display">{playlist.title}</h1>
            <p className="playlist-description">{playlist.description}</p>
            <span className="playlist-meta">
              {playlistSongs.length} songs · {totalMinutes} min
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="playlist-actions">
        <motion.button
          className="playlist-play-btn"
          onClick={handlePlayAll}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Play all"
        >
          <Play size={24} fill="black" color="black" />
        </motion.button>
      </div>

      {/* Track list */}
      <div className="playlist-track-list">
        <div className="track-list-header">
          <span className="track-col-num">#</span>
          <span className="track-col-title">Title</span>
          <span className="track-col-album">Album</span>
          <span className="track-col-duration">Duration</span>
        </div>
        {playlistSongs.map((song, i) => (
          <TrackRow
            key={song.id}
            song={song}
            index={i}
            onClick={() => handlePlayTrack(i)}
          />
        ))}
      </div>
    </motion.div>
  );
}
