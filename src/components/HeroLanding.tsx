'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Full-screen white overlay that reveals the app with a shrinking circle.
 * Any scroll/wheel or tapping the indicator progresses the reveal.
 */
export default function HeroLanding() {
  const [progress, setProgress] = useState(0); // 0 → 1
  const [hidden, setHidden] = useState(false);
  const animRef = useRef<number | null>(null);

  // Convert progress to a circle radius in pixels (large enough to cover the screen)
  const computeRadius = (p: number) => {
    if (typeof window === 'undefined') return 0;
    const vmax = Math.max(window.innerWidth, window.innerHeight);
    // Start ~1.2 * vmax (covers diagonals comfortably), end at 0
    const start = vmax * 1.2;
    return Math.max(start * (1 - p), 0);
  };

  // Handle wheel/touch to gradually increase progress
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const delta = e.deltaY;
      if (delta <= 0 && progress <= 0) return;
      const step = Math.abs(delta) / (window.innerHeight || 1) * 0.5; // tune sensitivity
      setProgress((p) => Math.min(1, Math.max(0, p + step)));
    };
    const onTouchMove = (e: TouchEvent) => {
      // Treat any vertical swipe as progress
      if (e.touches.length > 0) {
        setProgress((p) => Math.min(1, p + 0.05));
      }
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [progress]);

  // When fully revealed, remove overlay after transition
  useEffect(() => {
    if (progress >= 1 && !hidden) {
      const id = window.setTimeout(() => setHidden(true), 700);
      return () => window.clearTimeout(id);
    }
  }, [progress, hidden]);

  const animateToEnd = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const start = performance.now();
    const duration = 700;
    const from = progress;
    const tick = (t: number) => {
      const elapsed = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setProgress(from + (1 - from) * eased);
      if (elapsed < 1) {
        animRef.current = requestAnimationFrame(tick);
      }
    };
    animRef.current = requestAnimationFrame(tick);
  };

  if (hidden) return null;

  const radiusPx = computeRadius(progress);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{
        // Shrinking circle reveal
        WebkitClipPath: `circle(${radiusPx}px at 50% 50%)`,
        clipPath: `circle(${radiusPx}px at 50% 50%)`,
        transition: 'clip-path 300ms ease-out',
        background: '#F9F6EE',
        pointerEvents: progress >= 1 ? 'none' : 'auto',
      }}
    >
      <div className="flex flex-col items-center justify-center select-none" style={{ opacity: 1 - progress, fontFamily: '\"Courier New\", Courier, monospace' }}>
        <h1 className="text-6xl sm:text-7xl md:text-8xl font-extrabold tracking-tight text-black" style={{ fontFamily: '\"Courier New\", Courier, monospace' }}>
          MON-GO
        </h1>
        <p className="mt-4 text-gray-600 text-base sm:text-lg" style={{ fontFamily: '\"Courier New\", Courier, monospace' }}>Scroll to enter</p>
        <button
          type="button"
          onClick={animateToEnd}
          className="mt-10 text-gray-700 animate-bounce cursor-pointer"
          aria-label="Scroll to enter"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="opacity-80">
            <path d="M12 5v14M12 19l-6-6M12 19l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}


