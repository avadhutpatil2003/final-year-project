import React, { useState, useEffect } from 'react';

const AnimatedCounter = ({ value, duration = 1000, suffix = '', prefix = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(easeOutQuart * value);
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [value, duration]);

  const formatValue = (val) => {
    if (suffix === '%') {
      return val.toFixed(1);
    }
    return val.toString();
  };

  return (
    <span className="tabular-nums">
      {prefix}{formatValue(displayValue)}{suffix}
    </span>
  );
};

export default AnimatedCounter;
