import { useState, useCallback } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, LayoutGroup } from 'framer-motion'
import PageTransition from './components/PageTransition'
import Navbar from './components/Navbar'
import CustomCursor from './components/CustomCursor'
import Loader from './components/Loader'
import Home from './pages/Home'
import Work from './pages/Work'
import ProjectDetail from './pages/ProjectDetail'
import About from './pages/About'

function App() {
  const location = useLocation()
  const [loading, setLoading] = useState(true)

  const handleLoaderComplete = useCallback(() => {
    setLoading(false)
  }, [])

  return (
    <LayoutGroup>
      <CustomCursor />
      <Loader onComplete={handleLoaderComplete} />
      {!loading && (
        <>
          <Navbar />
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route
                path="/"
                element={
                  <PageTransition>
                    <Home />
                  </PageTransition>
                }
              />
              <Route
                path="/work"
                element={
                  <PageTransition>
                    <Work />
                  </PageTransition>
                }
              />
              <Route
                path="/project/:id"
                element={
                  <PageTransition>
                    <ProjectDetail />
                  </PageTransition>
                }
              />
              <Route
                path="/about"
                element={
                  <PageTransition>
                    <About />
                  </PageTransition>
                }
              />
            </Routes>
          </AnimatePresence>
        </>
      )}
    </LayoutGroup>
  )
}

export default App
