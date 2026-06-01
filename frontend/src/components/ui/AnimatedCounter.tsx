'use client';

import React, { useEffect, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number; // duration in ms
  formatFn?: (val: number) => string;
}

export function AnimatedCounter({ value, duration = 800, formatFn }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = count;
    const endValue = value;

    // Reset to start value on mount/first transition
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing function: easeOutQuad (starts fast, slows down smoothly)
      const easedProgress = progress * (2 - progress);
      
      const current = easedProgress * (endValue - startValue) + startValue;
      setCount(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(endValue);
      }
    };

    const animFrame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animFrame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const displayValue = formatFn ? formatFn(count) : Math.round(count).toString();
  return <span className="font-num tabular-nums">{displayValue}</span>;
}
