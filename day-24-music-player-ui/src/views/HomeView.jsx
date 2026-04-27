import { motion } from 'framer-motion';
import { usePlayer } from '../context/PlayerContext';
import { albums, playlists, songs, getSong, getAlbum } from '../data/songs';
import AlbumCard from '../components/AlbumCard';
import './HomeView.css';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function HomeView() {
  const { dispatch } = usePlayer();

  const handlePlaylistClick = (playlist) => {
    dispatch({ type: 'SET_VIEW', payload: { view: 'playlist', playlist } });
  };

  const handleAlbumPlay = (album) => {
    // Find all songs from this album and play the first
    const albumSongs = songs.filter(s => s.albumId === album.id);
    if (albumSongs.length > 0) {
      dispatch({ type: 'SET_QUEUE', payload: { queue: albumSongs, index: 0 } });
    }
  };

  /* Quick-pick grid (first 6 playlists as tiles) */
  const quickPicks = playlists.slice(0, 6);

  return (
    <motion.div
      className="home-view"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <motion.h1
        className="home-greeting text-display"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {getGreeting()}
      </motion.h1>

      {/* Quick picks grid */}
      <motion.div
        className="quick-picks-grid"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {quickPicks.map(pl => {
          const album = getAlbum(pl.albumId);
          return (
            <motion.button
              key={pl.id}
              className="quick-pick-card"
              variants={itemVariants}
              onClick={() => handlePlaylistClick(pl)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className="quick-pick-art"
                style={{ background: album?.gradient }}
              />
              <span className="quick-pick-title">{pl.title}</span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Recently Played */}
      <section className="home-section">
        <h2 className="home-section-title text-heading">Recently Played</h2>
        <div className="home-scroll-row">
          {albums.map(album => (
            <AlbumCard
              key={album.id}
              item={album}
              type="album"
              onClick={() => handleAlbumPlay(album)}
            />
          ))}
        </div>
      </section>

      {/* Made For You */}
      <section className="home-section">
        <h2 className="home-section-title text-heading">Made For You</h2>
        <div className="home-scroll-row">
          {playlists.map(pl => (
            <AlbumCard
              key={pl.id}
              item={pl}
              type="playlist"
              onClick={() => handlePlaylistClick(pl)}
            />
          ))}
        </div>
      </section>

      {/* Top Mixes */}
      <section className="home-section">
        <h2 className="home-section-title text-heading">Top Mixes</h2>
        <div className="home-scroll-row">
          {[...playlists].reverse().map(pl => (
            <AlbumCard
              key={`mix-${pl.id}`}
              item={{ ...pl, id: `mix-${pl.id}` }}
              type="playlist"
              onClick={() => handlePlaylistClick(pl)}
            />
          ))}
        </div>
      </section>
    </motion.div>
  );
}
