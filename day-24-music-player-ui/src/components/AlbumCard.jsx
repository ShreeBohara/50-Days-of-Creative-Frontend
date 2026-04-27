import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { getAlbum } from '../data/songs';
import './AlbumCard.css';

export default function AlbumCard({ item, type = 'album', onClick }) {
  // item can be an album, playlist, or song
  const album = item.albumId ? getAlbum(item.albumId) : item;

  return (
    <motion.button
      className="album-card"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      layout
      layoutId={`album-card-${item.id}`}
    >
      <div className="album-card-art-wrapper">
        <motion.div
          className="album-card-art"
          style={{ background: album?.gradient }}
          layoutId={`album-art-${item.id}`}
        />
        <motion.div
          className="album-card-play"
          initial={{ opacity: 0, y: 8 }}
          whileHover={{ opacity: 1, y: 0 }}
        >
          <Play size={22} fill="black" color="black" />
        </motion.div>
      </div>
      <div className="album-card-info">
        <span className="album-card-title">{item.title}</span>
        <span className="album-card-subtitle">
          {type === 'playlist' ? `${item.songIds?.length || 0} songs` : item.artist}
        </span>
      </div>
    </motion.button>
  );
}
