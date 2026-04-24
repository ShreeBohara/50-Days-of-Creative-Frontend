import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import './Timeline.css';

export default function Timeline() {
  const sectionRef = useRef(null);
  const lineRef = useRef(null);

  const events = [
    { year: "2015", text: "The beginning of the digital journey." },
    { year: "2018", text: "Embracing component-driven architecture." },
    { year: "2021", text: "The rise of web animations and WebGL." },
    { year: "2024", text: "AI integration and future possibilities." },
  ];

  useEffect(() => {
    let ctx = gsap.context(() => {
      // Draw line
      gsap.fromTo(lineRef.current, {
        scaleY: 0
      }, {
        scaleY: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 50%',
          end: 'bottom 80%',
          scrub: 1
        }
      });

      // Pop in events
      const nodes = gsap.utils.toArray('.timeline-event');
      nodes.forEach((node, i) => {
        gsap.fromTo(node, {
          opacity: 0,
          x: i % 2 === 0 ? 50 : -50,
          scale: 0.8
        }, {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 0.8,
          ease: 'back.out(1.7)',
          scrollTrigger: {
            trigger: node,
            start: 'top 80%',
            toggleActions: 'play none none reverse'
          }
        });
      });

    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="timeline-section">
      <h2 className="section-title">The Journey</h2>
      <div className="timeline-container">
        <div ref={lineRef} className="timeline-line"></div>
        {events.map((ev, i) => (
          <div key={i} className={`timeline-event ${i % 2 === 0 ? 'left' : 'right'}`}>
            <div className="event-dot"></div>
            <div className="event-content">
              <h3 className="event-year">{ev.year}</h3>
              <p className="event-text">{ev.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
