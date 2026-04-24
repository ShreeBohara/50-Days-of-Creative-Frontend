import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './HorizontalScroll.css';

gsap.registerPlugin(ScrollTrigger);

export default function HorizontalScroll() {
  const sectionRef = useRef(null);
  const scrollWrapperRef = useRef(null);

  const cards = [
    { title: "Concept", desc: "Every great piece starts with a single idea, iterated upon endlessly." },
    { title: "Design", desc: "Crafting the visual language that speaks volumes without words." },
    { title: "Motion", desc: "Breathing life into static pixels, orchestrating timing and easing." },
    { title: "Interaction", desc: "Connecting the user's intent with the digital response." },
    { title: "Delivery", desc: "Shipping a polished, performant experience to the world." }
  ];

  useEffect(() => {
    let ctx = gsap.context(() => {
      const wrapper = scrollWrapperRef.current;
      
      const getScrollAmount = () => {
        let wrapperWidth = wrapper.scrollWidth;
        return -(wrapperWidth - window.innerWidth);
      };

      const tween = gsap.to(wrapper, {
        x: getScrollAmount,
        ease: "none"
      });

      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: () => `+=${getScrollAmount() * -1}`,
        pin: true,
        animation: tween,
        scrub: 1,
        invalidateOnRefresh: true,
      });

    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="horizontal-section">
      <div ref={scrollWrapperRef} className="horizontal-wrapper">
        {cards.map((card, index) => (
          <div key={index} className="horizontal-card">
            <div className="card-number">0{index + 1}</div>
            <h2 className="card-title">{card.title}</h2>
            <p className="card-desc">{card.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
