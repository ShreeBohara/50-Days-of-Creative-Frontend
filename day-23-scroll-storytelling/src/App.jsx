import React from 'react';
import SmoothScroll from './components/SmoothScroll';
import Hero from './components/Hero';
import Stats from './components/Stats';
import HorizontalScroll from './components/HorizontalScroll';
import ImageReveal from './components/ImageReveal';
import ParallaxLayers from './components/ParallaxLayers';
import TextReveal from './components/TextReveal';
import ComparisonSlider from './components/ComparisonSlider';
import FeatureGrid from './components/FeatureGrid';
import Timeline from './components/Timeline';
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
        <TextReveal />
        <ComparisonSlider />
        <FeatureGrid />
        <Timeline />
      </div>
    </SmoothScroll>
  );
}

export default App;
