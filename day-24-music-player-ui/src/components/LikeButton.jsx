import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import './LikeButton.css';

export default function LikeButton({ songId, size = 16 }) {
  const { state, dispatch } = usePlayer();
  const isLiked = !!state.liked[songId];

  const handleClick = (e) => {
    e.stopPropagation();
    dispatch({ type: 'TOGGLE_LIKE', payload: songId });
  };

  return (
    <motion.button
      className={`like-btn ${isLiked ? 'liked' : ''}`}
      onClick={handleClick}
      whileTap={{ scale: 1.4 }}
      aria-label={isLiked ? 'Unlike' : 'Like'}
    >
      <Heart
        size={size}
        fill={isLiked ? 'var(--accent)' : 'none'}
        color={isLiked ? 'var(--accent)' : 'currentColor'}
      />
    </motion.button>
  );
}
