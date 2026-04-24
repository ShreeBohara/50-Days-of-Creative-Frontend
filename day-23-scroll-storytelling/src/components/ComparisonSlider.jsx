import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import './ComparisonSlider.css';

export default function ComparisonSlider() {
  const sectionRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
      const proxy = { percent: 100 };
      
      gsap.to(proxy, {
        percent: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 40%',
          end: 'bottom 60%',
          scrub: 1
        },
        onUpdate: () => {
          if (containerRef.current) {
            containerRef.current.style.setProperty('--clip', `${proxy.percent}%`);
          }
        }
      });
      
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="comparison-section">
      <h2 className="comparison-title">Evolution</h2>
      <div ref={containerRef} className="comparison-container" style={{'--clip': '100%'}}>
        <div className="image-after">
          <img src="https://images.unsplash.com/photo-1518655048521-f130df041f66?q=80&w=2000&auto=format&fit=crop" alt="Before" />
          <div className="comparison-label">Before</div>
        </div>
        <div className="image-before" style={{ clipPath: `inset(0 var(--clip) 0 0)` }}>
          <img src="https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=2000&auto=format&fit=crop" alt="After" />
          <div className="comparison-label">After</div>
        </div>
        <div className="slider-line" style={{ right: `var(--clip)` }}>
          <div className="slider-handle"></div>
        </div>
      </div>
    </section>
  );
}
