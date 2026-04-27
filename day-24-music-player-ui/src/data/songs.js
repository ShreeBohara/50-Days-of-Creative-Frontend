/* ───────── Song Data ─────────
   10 fake songs across 4 playlists.
   Album art is represented as CSS linear-gradient strings. */

export const albums = [
  {
    id: 'album-1',
    title: 'Midnight Echoes',
    artist: 'Luna Waves',
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    color: '#0f3460',
  },
  {
    id: 'album-2',
    title: 'Neon Pulse',
    artist: 'Synthwave Collective',
    gradient: 'linear-gradient(135deg, #ff006e 0%, #8338ec 50%, #3a86ff 100%)',
    color: '#8338ec',
  },
  {
    id: 'album-3',
    title: 'Golden Hour',
    artist: 'Amber Skies',
    gradient: 'linear-gradient(135deg, #f72585 0%, #ff7b00 50%, #ffbe0b 100%)',
    color: '#ff7b00',
  },
  {
    id: 'album-4',
    title: 'Deep Currents',
    artist: 'Oceanic',
    gradient: 'linear-gradient(135deg, #023e8a 0%, #0077b6 50%, #00b4d8 100%)',
    color: '#0077b6',
  },
  {
    id: 'album-5',
    title: 'Velvet Dreams',
    artist: 'Rosé',
    gradient: 'linear-gradient(135deg, #590d22 0%, #a4133c 50%, #ff758f 100%)',
    color: '#a4133c',
  },
  {
    id: 'album-6',
    title: 'Electric Forest',
    artist: 'Moss & Wire',
    gradient: 'linear-gradient(135deg, #004b23 0%, #006400 50%, #38b000 100%)',
    color: '#006400',
  },
];

export const songs = [
  { id: 's1', title: 'Falling Through Stars', artist: 'Luna Waves', albumId: 'album-1', duration: 234, freq: 220 },
  { id: 's2', title: 'Whispers at Dawn', artist: 'Luna Waves', albumId: 'album-1', duration: 198, freq: 247 },
  { id: 's3', title: 'Chromatic Rush', artist: 'Synthwave Collective', albumId: 'album-2', duration: 265, freq: 330 },
  { id: 's4', title: 'Circuit Dreams', artist: 'Synthwave Collective', albumId: 'album-2', duration: 312, freq: 294 },
  { id: 's5', title: 'Sunlit Reverie', artist: 'Amber Skies', albumId: 'album-3', duration: 207, freq: 262 },
  { id: 's6', title: 'Amber Glow', artist: 'Amber Skies', albumId: 'album-3', duration: 248, freq: 277 },
  { id: 's7', title: 'Abyssal Light', artist: 'Oceanic', albumId: 'album-4', duration: 289, freq: 196 },
  { id: 's8', title: 'Tidal Drift', artist: 'Oceanic', albumId: 'album-4', duration: 273, freq: 233 },
  { id: 's9', title: 'Petal Storm', artist: 'Rosé', albumId: 'album-5', duration: 221, freq: 349 },
  { id: 's10', title: 'Crimson Waltz', artist: 'Rosé', albumId: 'album-5', duration: 256, freq: 311 },
];

export const playlists = [
  {
    id: 'pl-1',
    title: 'Late Night Vibes',
    description: 'Chill beats for the late hours',
    songIds: ['s1', 's2', 's7', 's8', 's9'],
    albumId: 'album-1',
  },
  {
    id: 'pl-2',
    title: 'Energy Boost',
    description: 'High energy tracks to power your day',
    songIds: ['s3', 's4', 's5', 's6'],
    albumId: 'album-2',
  },
  {
    id: 'pl-3',
    title: 'Sunset Drive',
    description: 'The perfect driving soundtrack',
    songIds: ['s5', 's6', 's1', 's10'],
    albumId: 'album-3',
  },
  {
    id: 'pl-4',
    title: 'Deep Focus',
    description: 'Ambient sounds for concentration',
    songIds: ['s7', 's8', 's2', 's9'],
    albumId: 'album-4',
  },
  {
    id: 'pl-5',
    title: 'Romance',
    description: 'Songs that touch the heart',
    songIds: ['s9', 's10', 's5', 's1'],
    albumId: 'album-5',
  },
  {
    id: 'pl-6',
    title: 'Into the Wild',
    description: 'Nature-inspired electronic',
    songIds: ['s3', 's7', 's6', 's4', 's8'],
    albumId: 'album-6',
  },
];

/* Helper: get album by id */
export function getAlbum(albumId) {
  return albums.find(a => a.id === albumId);
}

/* Helper: get song by id */
export function getSong(songId) {
  return songs.find(s => s.id === songId);
}

/* Helper: format seconds → mm:ss */
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/* Helper: get total duration of a playlist */
export function getPlaylistDuration(playlist) {
  return playlist.songIds.reduce((sum, sid) => {
    const song = getSong(sid);
    return sum + (song ? song.duration : 0);
  }, 0);
}
