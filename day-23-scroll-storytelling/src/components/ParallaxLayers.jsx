import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './ParallaxLayers.css';

export default function ParallaxLayers() {
  const sectionRef = useRef(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
      const layers = gsap.utils.toArray('.parallax-layer');

      layers.forEach((layer) => {
        const speed = layer.getAttribute('data-speed');
        
        gsap.to(layer, {
          y: (i, target) => -ScrollTrigger.maxScroll(window) * speed,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1
          }
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="parallax-section">
      <div className="parallax-wrapper">
        <h2 className="parallax-title parallax-layer" data-speed="0.05">DEPTH<br/>MATTERS</h2>
        <div className="parallax-layer layer-1" data-speed="0.1"></div>
        <div className="parallax-layer layer-2" data-speed="0.2"></div>
        <div className="parallax-layer layer-3" data-speed="0.35"></div>
        <div className="parallax-layer layer-4" data-speed="0.5"></div>
        <div className="parallax-layer layer-5" data-speed="0.8"></div>
      </div>
    </section>
  );
}
