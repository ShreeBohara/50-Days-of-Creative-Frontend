import { useRef, useState, useEffect } from 'react';
import './MarqueeText.css';

export default function MarqueeText({ text, className = '' }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    const check = () => {
      if (containerRef.current && textRef.current) {
        setShouldScroll(textRef.current.scrollWidth > containerRef.current.clientWidth);
      }
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [text]);

  return (
    <div className={`marquee-container ${className}`} ref={containerRef}>
      <span
        className={`marquee-text ${shouldScroll ? 'scrolling' : ''}`}
        ref={textRef}
      >
        {text}
        {shouldScroll && <span className="marquee-spacer">{'  •  '}{text}</span>}
      </span>
    </div>
  );
}
