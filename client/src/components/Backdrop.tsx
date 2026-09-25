/**
 * The room behind everything: lamp light, a halftone screen, and a few faint
 * question marks drifting up. Pure CSS animation, low contrast, and it stops
 * with prefers-reduced-motion.
 */

import { memo, useMemo } from 'react';

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export const Backdrop = memo(function Backdrop({ dim = false }: { dim?: boolean }) {
  const marks = useMemo(() => {
    const rnd = seeded(11);
    return Array.from({ length: 14 }, (_, i) => ({
      id: i,
      left: rnd() * 100,
      size: 26 + rnd() * 70,
      duration: 26 + rnd() * 26,
      delay: -rnd() * 50,
      dx: (rnd() - 0.5) * 80,
      r0: (rnd() - 0.5) * 30,
      r1: (rnd() - 0.5) * 30,
      glyph: rnd() < 0.8 ? '?' : '!',
      opacity: 0.035 + rnd() * 0.05,
    }));
  }, []);

  return (
    <>
      <div className="room-bg" />
      <div
        className="pointer-events-none fixed inset-0 -z-[1] overflow-hidden transition-opacity duration-700"
        style={{ opacity: dim ? 0.4 : 1 }}
        aria-hidden
      >
        {marks.map((m) => (
          <span
            key={m.id}
            className="drift-up display font-bold text-paper"
            style={
              {
                left: `${m.left}%`,
                fontSize: m.size,
                animationDuration: `${m.duration}s`,
                animationDelay: `${m.delay}s`,
                '--dx': `${m.dx}px`,
                '--r0': `${m.r0}deg`,
                '--r1': `${m.r1}deg`,
                '--o': m.opacity,
              } as React.CSSProperties
            }
          >
            {m.glyph}
          </span>
        ))}
      </div>
    </>
  );
});
