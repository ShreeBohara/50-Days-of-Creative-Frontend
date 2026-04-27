import { createContext, useContext, useReducer, useCallback, useRef } from 'react';
import { songs, getAlbum } from '../data/songs';

const PlayerContext = createContext(null);

const initialState = {
  currentTrack: null,
  isPlaying: false,
  elapsed: 0,
  volume: 0.7,
  queue: [],
  queueIndex: -1,
  shuffle: false,
  repeat: 'off', // 'off' | 'all' | 'one'
  liked: {},
  currentView: 'home',     // 'home' | 'playlist' | 'nowplaying'
  currentPlaylist: null,    // playlist object when viewing one
  previousView: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_TRACK': {
      const track = action.payload;
      const album = getAlbum(track.albumId);
      return {
        ...state,
        currentTrack: { ...track, album },
        isPlaying: true,
        elapsed: 0,
      };
    }
    case 'PLAY':
      return { ...state, isPlaying: true };
    case 'PAUSE':
      return { ...state, isPlaying: false };
    case 'TOGGLE_PLAY':
      return { ...state, isPlaying: !state.isPlaying };
    case 'SET_ELAPSED':
      return { ...state, elapsed: action.payload };
    case 'SET_VOLUME':
      return { ...state, volume: Math.max(0, Math.min(1, action.payload)) };
    case 'SET_QUEUE': {
      const { queue, index } = action.payload;
      const track = queue[index];
      const album = getAlbum(track.albumId);
      return {
        ...state,
        queue,
        queueIndex: index,
        currentTrack: { ...track, album },
        isPlaying: true,
        elapsed: 0,
      };
    }
    case 'NEXT': {
      if (state.queue.length === 0) return state;
      if (state.repeat === 'one') {
        return { ...state, elapsed: 0, isPlaying: true };
      }
      let nextIndex;
      if (state.shuffle) {
        nextIndex = Math.floor(Math.random() * state.queue.length);
      } else {
        nextIndex = state.queueIndex + 1;
        if (nextIndex >= state.queue.length) {
          if (state.repeat === 'all') nextIndex = 0;
          else return { ...state, isPlaying: false };
        }
      }
      const nextTrack = state.queue[nextIndex];
      const nextAlbum = getAlbum(nextTrack.albumId);
      return {
        ...state,
        queueIndex: nextIndex,
        currentTrack: { ...nextTrack, album: nextAlbum },
        elapsed: 0,
        isPlaying: true,
      };
    }
    case 'PREV': {
      if (state.queue.length === 0) return state;
      if (state.elapsed > 3) {
        return { ...state, elapsed: 0 };
      }
      let prevIndex = state.queueIndex - 1;
      if (prevIndex < 0) {
        if (state.repeat === 'all') prevIndex = state.queue.length - 1;
        else return { ...state, elapsed: 0 };
      }
      const prevTrack = state.queue[prevIndex];
      const prevAlbum = getAlbum(prevTrack.albumId);
      return {
        ...state,
        queueIndex: prevIndex,
        currentTrack: { ...prevTrack, album: prevAlbum },
        elapsed: 0,
        isPlaying: true,
      };
    }
    case 'TOGGLE_SHUFFLE':
      return { ...state, shuffle: !state.shuffle };
    case 'TOGGLE_REPEAT': {
      const order = ['off', 'all', 'one'];
      const idx = order.indexOf(state.repeat);
      return { ...state, repeat: order[(idx + 1) % 3] };
    }
    case 'TOGGLE_LIKE': {
      const id = action.payload;
      const liked = { ...state.liked };
      if (liked[id]) delete liked[id];
      else liked[id] = true;
      return { ...state, liked };
    }
    case 'SET_VIEW':
      return {
        ...state,
        previousView: state.currentView,
        currentView: action.payload.view,
        currentPlaylist: action.payload.playlist || state.currentPlaylist,
      };
    case 'GO_BACK':
      return {
        ...state,
        currentView: state.previousView || 'home',
        previousView: null,
      };
    default:
      return state;
  }
}

export function PlayerProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainNodeRef = useRef(null);

  const startAudio = useCallback((freq = 220) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      // Stop any previous oscillator
      if (oscillatorRef.current) {
        try { oscillatorRef.current.stop(); } catch (e) { /* ignore */ }
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      oscillatorRef.current = osc;
      gainNodeRef.current = gain;
    } catch (e) {
      console.warn('Web Audio not available:', e);
    }
  }, []);

  const stopAudio = useCallback(() => {
    try {
      if (gainNodeRef.current && audioContextRef.current) {
        gainNodeRef.current.gain.linearRampToValueAtTime(
          0, audioContextRef.current.currentTime + 0.1
        );
      }
      setTimeout(() => {
        if (oscillatorRef.current) {
          try { oscillatorRef.current.stop(); } catch (e) { /* ignore */ }
          oscillatorRef.current = null;
        }
      }, 150);
    } catch (e) { /* ignore */ }
  }, []);

  const value = {
    state,
    dispatch,
    startAudio,
    stopAudio,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
