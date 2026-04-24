import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import './FeatureGrid.css';

export default function FeatureGrid() {
  const sectionRef = useRef(null);

  const features = [
    { title: "Performance", icon: "⚡" },
    { title: "Accessibility", icon: "♿" },
    { title: "Scalability", icon: "📈" },
    { title: "Security", icon: "🔒" },
  ];

  useEffect(() => {
    let ctx = gsap.context(() => {
      const cards = gsap.utils.toArray('.feature-card');
      
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
          end: 'bottom 30%',
          toggleActions: 'play none none reverse'
        }
      });

      // Fly in from different directions
      cards.forEach((card, i) => {
        const dirX = i % 2 === 0 ? -100 : 100;
        const dirY = i < 2 ? -100 : 100;
        
        tl.fromTo(card, {
          x: dirX,
          y: dirY,
          opacity: 0,
          rotation: (Math.random() - 0.5) * 45
        }, {
          x: 0,
          y: 0,
          opacity: 1,
          rotation: 0,
          duration: 1.2,
          ease: 'power3.out'
        }, 0);
      });

    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="feature-grid-section">
      <h2 className="section-title">Core Principles</h2>
      <div className="feature-grid">
        {features.map((feature, idx) => (
          <div key={idx} className="feature-card">
            <div className="feature-icon">{feature.icon}</div>
            <h3 className="feature-title">{feature.title}</h3>
          </div>
        ))}
      </div>
    </section>
  );
}
