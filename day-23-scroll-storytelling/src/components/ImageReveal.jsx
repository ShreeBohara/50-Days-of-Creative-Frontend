import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import './ImageReveal.css';

export default function ImageReveal() {
  const sectionRef = useRef(null);
  const imageContainerRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
      // Reveal the container width from 0 to 100%
      gsap.fromTo(imageContainerRef.current, {
        clipPath: 'inset(0 100% 0 0)'
      }, {
        clipPath: 'inset(0 0% 0 0)',
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          end: 'bottom center',
          scrub: 1
        }
      });
      
      // Slight scale out of the image inside
      gsap.fromTo(imageRef.current, {
        scale: 1.2
      }, {
        scale: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          end: 'bottom center',
          scrub: 1
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="reveal-section">
      <div className="reveal-content">
        <h2 className="reveal-title">Unveiling The Future</h2>
        <div ref={imageContainerRef} className="reveal-image-container">
          <img 
            ref={imageRef}
            src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2000&auto=format&fit=crop" 
            alt="Revealed Future" 
            className="reveal-image"
          />
        </div>
      </div>
    </section>
  );
}
