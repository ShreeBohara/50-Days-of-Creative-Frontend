import React from 'react';
import SmoothScroll from './components/SmoothScroll';
import Hero from './components/Hero';
import Stats from './components/Stats';
import './App.css';

function App() {
  return (
    <SmoothScroll>
      <div className="app-container">
        <Hero />
        <Stats />
      </div>
    </SmoothScroll>
  );
}

export default App;
