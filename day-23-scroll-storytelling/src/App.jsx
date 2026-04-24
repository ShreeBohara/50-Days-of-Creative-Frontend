import React from 'react';
import SmoothScroll from './components/SmoothScroll';
import Hero from './components/Hero';
import Stats from './components/Stats';
import HorizontalScroll from './components/HorizontalScroll';
import ImageReveal from './components/ImageReveal';
import ParallaxLayers from './components/ParallaxLayers';
import './App.css';

function App() {
  return (
    <SmoothScroll>
      <div className="app-container">
        <Hero />
        <Stats />
        <HorizontalScroll />
        <ImageReveal />
        <ParallaxLayers />
      </div>
    </SmoothScroll>
  );
}

export default App;
