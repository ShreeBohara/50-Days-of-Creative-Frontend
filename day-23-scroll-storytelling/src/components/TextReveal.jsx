import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import './TextReveal.css';

export default function TextReveal() {
  const sectionRef = useRef(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
      const lines = gsap.utils.toArray('.reveal-line-inner');

      gsap.fromTo(lines, {
        yPercent: 100,
        opacity: 0
      }, {
        yPercent: 0,
        opacity: 1,
        stagger: 0.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
          end: 'bottom 40%',
          scrub: 1
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="text-reveal-section">
      <div className="text-reveal-container">
        <div className="reveal-line"><div className="reveal-line-inner">In the space between code and canvas,</div></div>
        <div className="reveal-line"><div className="reveal-line-inner">we discover the true art of interaction.</div></div>
        <div className="reveal-line"><div className="reveal-line-inner">Every pixel tells a story,</div></div>
        <div className="reveal-line"><div className="reveal-line-inner">every motion guides the eye,</div></div>
        <div className="reveal-line"><div className="reveal-line-inner">and every scroll deepens the journey.</div></div>
      </div>
    </section>
  );
}
