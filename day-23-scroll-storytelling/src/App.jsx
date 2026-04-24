import React from 'react';
import SmoothScroll from './components/SmoothScroll';
import Hero from './components/Hero';
import './App.css';

function App() {
  return (
    <SmoothScroll>
      <div className="app-container">
        <Hero />
      </div>
    </SmoothScroll>
  );
}

export default App;
