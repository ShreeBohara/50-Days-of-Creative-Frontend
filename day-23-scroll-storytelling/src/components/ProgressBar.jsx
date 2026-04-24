import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import './ProgressBar.css';

export default function ProgressBar() {
  const barRef = useRef(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
      gsap.to(barRef.current, {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: document.body,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.1
        }
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="progress-container">
      <div ref={barRef} className="progress-bar"></div>
    </div>
  );
}
