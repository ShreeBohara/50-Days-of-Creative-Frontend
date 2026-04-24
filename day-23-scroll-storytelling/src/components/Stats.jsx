import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import './Stats.css';

export default function Stats() {
  const sectionRef = useRef(null);

  const stats = [
    { label: "Hours Rendered", value: 1420, suffix: "+" },
    { label: "Frames Processed", value: 85, suffix: "M" },
    { label: "Global Reach", value: 120, suffix: "" },
    { label: "Customer Satisfaction", value: 99, suffix: "%" },
  ];

  useEffect(() => {
    let ctx = gsap.context(() => {
      const numbers = gsap.utils.toArray('.stat-number-val');
      const bars = gsap.utils.toArray('.stat-bar-fill');

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          end: 'bottom 25%',
          toggleActions: 'play none none reverse',
        }
      });

      // Count up numbers
      numbers.forEach((num) => {
        const target = parseFloat(num.getAttribute('data-target'));
        tl.fromTo(num, 
          { innerText: 0 }, 
          {
            innerText: target,
            duration: 2,
            ease: 'power2.out',
            snap: { innerText: 1 },
            onUpdate: function() {
              num.innerHTML = Math.ceil(this.targets()[0].innerText);
            }
          }, 0
        );
      });

      // Grow bars
      tl.fromTo(bars, {
        scaleX: 0,
      }, {
        scaleX: 1,
        duration: 2,
        stagger: 0.1,
        ease: 'power3.out',
        transformOrigin: 'left center'
      }, 0);

      // Fade in text
      tl.fromTo('.stat-label', {
        opacity: 0,
        y: 20
      }, {
        opacity: 1,
        y: 0,
        duration: 1,
        stagger: 0.1,
        ease: 'power2.out'
      }, 0.5);

    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="stats-section">
      <div className="stats-container">
        {stats.map((stat, i) => (
          <div key={i} className="stat-item">
            <div className="stat-number">
              <span className="stat-number-val" data-target={stat.value}>0</span>
              <span className="stat-suffix">{stat.suffix}</span>
            </div>
            <div className="stat-bar">
              <div className="stat-bar-fill"></div>
            </div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
