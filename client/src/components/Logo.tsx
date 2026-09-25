/** Title lockup: the watching eye under a fedora, over the game's name. */

import { motion } from 'framer-motion';
import { CREAM, INK, PAPER, RED } from '../lib/theme';

export function EyeMark({ size = 56, look = true }: { size?: number; look?: boolean }) {
  return (
    <svg width={size} height={size * 0.78} viewBox="0 0 100 78" aria-hidden>
      <path d="M26 30 Q27 6 50 6 Q73 6 74 30Z" fill={PAPER} />
      <rect x="26.5" y="23" width="47" height="6" fill={RED} />
      <ellipse cx="50" cy="31" rx="40" ry="6.5" fill={PAPER} />
      <path d="M8 56 L50 34 L92 56 L50 78Z" fill={RED} />
      <circle cx="50" cy="56" r="14" fill={CREAM} />
      <motion.g
        animate={look ? { x: [0, -5, -5, 5, 5, 0] } : undefined}
        transition={{ duration: 5, repeat: Infinity, times: [0, 0.12, 0.4, 0.52, 0.85, 1], ease: 'easeInOut' }}
      >
        <circle cx="50" cy="56" r="7" fill={INK} />
        <circle cx="47.5" cy="53.5" r="2" fill={CREAM} />
      </motion.g>
    </svg>
  );
}

export function Logo({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <span className="flex items-center gap-2">
        <EyeMark size={30} look={false} />
        <span className="display hidden whitespace-nowrap text-xl font-bold leading-none tracking-wide text-paper min-[420px]:inline">
          NỘI <span className="text-vermilion">GIÁN</span>
        </span>
      </span>
    );
  }
  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 16 }}
      >
        <EyeMark size={92} />
      </motion.div>
      <h1 className="display mt-2 text-6xl font-bold leading-[0.9] tracking-wide text-paper sm:text-7xl">
        NỘI <span className="text-vermilion">GIÁN</span>
      </h1>
      <p className="display mt-2 text-xs font-medium uppercase tracking-[0.4em] text-paper/55">Insider · bản tiếng Việt</p>
    </div>
  );
}
