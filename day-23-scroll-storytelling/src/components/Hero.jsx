import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import './Hero.css';

export default function Hero() {
  const heroRef = useRef(null);
  const textRef = useRef(null);
  const bgRef = useRef(null);

  const title = "CINEMATIC";

  useEffect(() => {
    let ctx = gsap.context(() => {
      const letters = gsap.utils.toArray('.char');
      
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
          pin: true,
        }
      });

      // Scatter letters
      letters.forEach((letter) => {
        const randomX = (Math.random() - 0.5) * 1000;
        const randomY = (Math.random() - 0.5) * 1000;
        const randomRot = (Math.random() - 0.5) * 360;
        const randomRotX = (Math.random() - 0.5) * 360;
        
        tl.to(letter, {
          x: randomX,
          y: randomY,
          rotationZ: randomRot,
          rotationX: randomRotX,
          opacity: 0,
          scale: Math.random() * 2 + 0.5,
          ease: 'power1.inOut'
        }, 0);
      });

      // Background zoom and blur
      tl.to(bgRef.current, {
        scale: 1.3,
        filter: 'blur(15px)',
        opacity: 0.2,
        ease: 'power1.inOut'
      }, 0);

      // Fade out subtitle
      tl.to('.hero-subtitle', {
        opacity: 0,
        y: -20,
        ease: 'power1.inOut'
      }, 0);

    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={heroRef} className="hero-section">
      <div 
        ref={bgRef}
        className="hero-bg" 
        style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop)' }}
      ></div>
      <div className="hero-overlay"></div>
      
      <div className="hero-content">
        <h1 ref={textRef} className="hero-title">
          {title.split('').map((char, i) => (
            <span key={i} className="char">{char}</span>
          ))}
        </h1>
        <p className="hero-subtitle">Scroll to explore</p>
      </div>
    </section>
  );
}
