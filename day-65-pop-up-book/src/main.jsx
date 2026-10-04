import '@fontsource/caprasimo/latin-400.css'
import '@fontsource-variable/newsreader/wght.css'
import '@fontsource-variable/newsreader/wght-italic.css'
import '@fontsource/fragment-mono/latin-400.css'
import './index.css'

// No WebGL2 (or ?nowebgl=1) was decided by the inline gate in index.html: the
// book's contents become a plain page, and neither React nor three.js is ever
// downloaded.
if (document.documentElement.classList.contains('no-webgl')) {
  import('./fallback.js').then(({ renderFallback }) => renderFallback('It needs WebGL2, which this browser didn’t provide.'))
} else {
  // the app downloads while the fonts load; it mounts once both are in (die-cut
  // outlines are traced from type, so the fonts must be ready first)
  const fonts = ['400 20px "Caprasimo"', '400 20px "Newsreader Variable"', 'italic 400 20px "Newsreader Variable"', '400 20px "Fragment Mono"']
  const fontsReady = Promise.all(fonts.map((f) => document.fonts.load(f))).catch(() => {})
  Promise.all([import('./boot.jsx'), fontsReady])
    .then(([{ boot }]) => boot(document.getElementById('root')))
    .catch(() => {
      // a chunk failed to download (a flaky network, a redeploy mid-visit):
      // show the static notice now, then try for the full contents list
      const why = 'The book couldn’t finish loading — check the connection and reload.'
      document.documentElement.classList.add('no-webgl')
      const note = document.querySelector('.fallback__why')
      if (note) note.textContent = why
      import('./fallback.js')
        .then(({ renderFallback }) => renderFallback(why))
        .catch(() => {})
    })
}
