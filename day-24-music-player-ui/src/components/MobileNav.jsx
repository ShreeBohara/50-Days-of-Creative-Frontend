import { usePlayer } from '../context/PlayerContext';
import { Home, Search, Library } from 'lucide-react';
import './MobileNav.css';

export default function MobileNav() {
  const { state, dispatch } = usePlayer();

  const handleNav = (view) => {
    dispatch({ type: 'SET_VIEW', payload: { view } });
  };

  return (
    <nav className="mobile-nav">
      <button
        className={`mobile-nav-item ${state.currentView === 'home' ? 'active' : ''}`}
        onClick={() => handleNav('home')}
      >
        <Home size={22} />
        <span>Home</span>
      </button>
      <button className="mobile-nav-item">
        <Search size={22} />
        <span>Search</span>
      </button>
      <button className="mobile-nav-item">
        <Library size={22} />
        <span>Library</span>
      </button>
    </nav>
  );
}
