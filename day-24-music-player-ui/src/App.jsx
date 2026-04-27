import { AnimatePresence } from 'framer-motion';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import PlayerBar from './components/PlayerBar';
import NowPlayingView from './views/NowPlayingView';
import HomeView from './views/HomeView';
import PlaylistView from './views/PlaylistView';
import './App.css';

function MainContent() {
  const { state } = usePlayer();

  return (
    <AnimatePresence mode="wait">
      {state.currentView === 'home' && <HomeView key="home" />}
      {state.currentView === 'playlist' && <PlaylistView key="playlist" />}
    </AnimatePresence>
  );
}

function App() {
  return (
    <PlayerProvider>
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <MainContent />
        </main>
        <PlayerBar />
        <MobileNav />
        <NowPlayingOverlay />
      </div>
    </PlayerProvider>
  );
}

function NowPlayingOverlay() {
  const { state } = usePlayer();
  return (
    <AnimatePresence>
      {state.currentView === 'nowplaying' && <NowPlayingView key="nowplaying" />}
    </AnimatePresence>
  );
}

export default App;
