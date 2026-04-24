import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import './FinalCTA.css';

export default function FinalCTA() {
  const sectionRef = useRef(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
      const elements = gsap.utils.toArray('.converge-item');
      
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          end: 'center center',
          scrub: 1
        }
      });

      // Elements start scattered far away and converge
      elements.forEach((el, i) => {
        // distribute them in a circle far out
        const angle = (i / elements.length) * Math.PI * 2;
        const dist = 1000;
        const startX = Math.cos(angle) * dist;
        const startY = Math.sin(angle) * dist;

        tl.fromTo(el, {
          x: startX,
          y: startY,
          opacity: 0,
          scale: 0,
          rotation: (Math.random() - 0.5) * 360
        }, {
          x: 0,
          y: 0,
          opacity: 1,
          scale: 1,
          rotation: 0,
          ease: 'power2.out'
        }, 0);
      });

    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="final-cta-section">
      <div className="cta-container">
        <div className="converge-item cta-bg-glow"></div>
        <h2 className="converge-item cta-title">Ready to Start?</h2>
        <p className="converge-item cta-desc">Let's build something extraordinary together.</p>
        <button className="converge-item cta-btn">Get in Touch</button>
      </div>
    </section>
  );
}
