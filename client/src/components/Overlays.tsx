/** Small full-screen moments: notices, paper confetti, the "found it!" banner. */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Avatar } from './art/Avatar';

/* ---------------------------------------------------------------- toast */

export function Toast({ message }: { message: string | null }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[80] flex justify-center px-4">
      {message && (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: -16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="paper rounded-2xl px-4 py-2 text-sm font-semibold"
        >
          {message}
        </motion.div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- confetti */

const PAPER_COLORS = ['#d83d31', '#e2a93b', '#2f7f7a', '#3561a6', '#f7f0df', '#7b4b7f'];

/** Cut-paper confetti falling from the top of the screen, once. */
export function Confetti({ seed = 1, count = 70 }: { seed?: number; count?: number }) {
  const bits = useMemo(() => {
    let s = seed * 9301 + 49297;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: rnd() * 100,
      w: 6 + rnd() * 8,
      h: 8 + rnd() * 10,
      color: PAPER_COLORS[Math.floor(rnd() * PAPER_COLORS.length)],
      delay: rnd() * 0.6,
      duration: 2.2 + rnd() * 1.8,
      drift: (rnd() - 0.5) * 160,
      spin: (rnd() - 0.5) * 900,
      round: rnd() < 0.3,
    }));
  }, [seed, count]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden>
      {bits.map((b) => (
        <motion.span
          key={b.id}
          className="absolute top-0 block"
          style={{
            left: `${b.x}%`,
            width: b.w,
            height: b.round ? b.w : b.h,
            background: b.color,
            borderRadius: b.round ? 999 : 2,
          }}
          initial={{ y: -40, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '105vh', x: b.drift, rotate: b.spin, opacity: [1, 1, 0.9, 0] }}
          transition={{ delay: b.delay, duration: b.duration, ease: [0.2, 0.6, 0.4, 1] }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ found it! */

/**
 * The moment somebody names the keyword: a stamp, the word, and who said it.
 * It fades itself in and out; the parent unmounts it on a timer, so it can
 * never get stuck on screen (exit animations stall in hidden tabs).
 */
export function FoundBanner({ word, name, avatar }: { word: string; name: string; avatar: number }) {
  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-night/55 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: 2.6, times: [0, 0.08, 0.86, 1] }}
    >
      <motion.div
        className="paper flex flex-col items-center rounded-3xl px-8 py-6 text-center"
        initial={{ scale: 0.6, rotate: -6, y: 40 }}
        animate={{ scale: 1, rotate: [-6, 3, -1, 0], y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14 }}
      >
        <motion.span
          className="display rounded-lg border-4 border-olive px-4 py-1 text-3xl font-bold uppercase tracking-widest text-olive"
          initial={{ scale: 2.6, rotate: -18, opacity: 0 }}
          animate={{ scale: 1, rotate: -5, opacity: 1 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 500, damping: 16 }}
        >
          Đúng rồi!
        </motion.span>
        <div className="label mt-4">Từ khóa là</div>
        <motion.div
          className="display mt-1 text-4xl font-bold uppercase tracking-wide text-ink sm:text-5xl"
          initial={{ letterSpacing: '0.4em', opacity: 0 }}
          animate={{ letterSpacing: '0.04em', opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          {word}
        </motion.div>
        <div className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
          <Avatar id={avatar} size={30} mood="happy" />
          <span>
            <b className="text-ink">{name}</b> đã tìm ra — lật đồng hồ!
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
