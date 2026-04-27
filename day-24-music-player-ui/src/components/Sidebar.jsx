import { usePlayer } from '../context/PlayerContext';
import { playlists, getAlbum } from '../data/songs';
import { Home, Search, Library, Plus, Heart } from 'lucide-react';
import './Sidebar.css';

export default function Sidebar() {
  const { state, dispatch } = usePlayer();

  const handleNav = (view) => {
    dispatch({ type: 'SET_VIEW', payload: { view } });
  };

  const handlePlaylistClick = (playlist) => {
    dispatch({ type: 'SET_VIEW', payload: { view: 'playlist', playlist } });
  };

  return (
    <aside className="sidebar">
      {/* Top navigation */}
      <nav className="sidebar-nav">
        <button
          className={`sidebar-nav-item ${state.currentView === 'home' ? 'active' : ''}`}
          onClick={() => handleNav('home')}
        >
          <Home size={24} />
          <span>Home</span>
        </button>
        <button className="sidebar-nav-item">
          <Search size={24} />
          <span>Search</span>
        </button>
      </nav>

      {/* Library section */}
      <div className="sidebar-library">
        <div className="library-header">
          <button className="library-title">
            <Library size={24} />
            <span>Your Library</span>
          </button>
          <button className="library-add" aria-label="Create playlist">
            <Plus size={20} />
          </button>
        </div>

        <div className="library-list">
          {/* Liked Songs card */}
          <button
            className="library-item liked-songs"
            onClick={() => handleNav('home')}
          >
            <div className="liked-songs-icon">
              <Heart size={14} fill="white" />
            </div>
            <div className="library-item-info">
              <span className="library-item-title">Liked Songs</span>
              <span className="library-item-meta">Playlist · {Object.keys(state.liked).length} songs</span>
            </div>
          </button>

          {/* Playlists */}
          {playlists.map(pl => {
            const album = getAlbum(pl.albumId);
            const isActive = state.currentView === 'playlist'
              && state.currentPlaylist?.id === pl.id;
            return (
              <button
                key={pl.id}
                className={`library-item ${isActive ? 'active' : ''}`}
                onClick={() => handlePlaylistClick(pl)}
              >
                <div
                  className="library-item-art"
                  style={{ background: album?.gradient }}
                />
                <div className="library-item-info">
                  <span className="library-item-title">{pl.title}</span>
                  <span className="library-item-meta">Playlist · {pl.songIds.length} songs</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
