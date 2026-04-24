import React from 'react';
import SmoothScroll from './components/SmoothScroll';
import Hero from './components/Hero';
import Stats from './components/Stats';
import HorizontalScroll from './components/HorizontalScroll';
import './App.css';

function App() {
  return (
    <SmoothScroll>
      <div className="app-container">
        <Hero />
        <Stats />
        <HorizontalScroll />
      </div>
    </SmoothScroll>
  );
}

export default App;
