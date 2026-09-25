/** Small pieces shared by the phases: role chips, the timer header, the "your tile" peek. */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameState, PrivateState, Role } from '@shared/types';
import { Hourglass } from '../art/Hourglass';
import { CardBack, RoleFace } from '../art/RoleCard';
import { mmss, useRemaining } from '../../lib/clock';
import { ROLES } from '../../lib/theme';
import { sfx } from '../../lib/sound';

export function RoleChip({ role, size = 'sm' }: { role: Role; size?: 'sm' | 'md' }) {
  const meta = ROLES[role];
  return (
    <span
      className={`display inline-block rounded-md font-semibold uppercase tracking-wider ${
        size === 'sm' ? 'px-1.5 py-px text-[9.5px]' : 'px-2 py-0.5 text-xs'
      }`}
      style={{ background: meta.color, color: role === 'common' ? '#242422' : '#fbf6ea' }}
    >
      {meta.label}
    </span>
  );
}

export function PendingDots({ className = '' }: { className?: string }) {
  return (
    <span className={`dot-anim inline-flex gap-0.5 ${className}`} aria-label="đang chờ">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
    </span>
  );
}

/**
 * The top of the Q&A and the discussion: the hourglass, the time left, what
 * to do now. During the discussion the glass has been turned over.
 */
export function HourglassHeader({
  state,
  title,
  hint,
  aside,
}: {
  state: GameState;
  title: string;
  hint: React.ReactNode;
  aside?: React.ReactNode;
}) {
  const left = useRemaining(state.deadline);
  const qaMs = state.settings.qaSeconds * 1000;
  const flipped = state.phase !== 'qa';
  const running = state.phase === 'qa' || state.phase === 'discussion';
  const urgent = running && left > 0 && left < 20_000;
  return (
    <div className="flex items-center gap-3 border-b border-ink/10 px-4 py-3">
      <Hourglass fraction={left / qaMs} running={running && left > 0} turns={flipped ? 1 : 0} height={74} urgent={urgent} />
      <div className="min-w-0 flex-1">
        <h2 className="display text-xl font-bold uppercase leading-tight tracking-wide text-ink sm:text-2xl">{title}</h2>
        <div className="mt-0.5 text-xs leading-snug text-ink-soft sm:text-sm">{hint}</div>
      </div>
      {aside}
      <motion.div
        key={urgent ? 'urgent' : 'calm'}
        className={`display shrink-0 text-right text-3xl font-bold tabular-nums sm:text-4xl ${urgent ? 'text-vermilion' : 'text-ink'}`}
        animate={urgent ? { scale: [1, 1.08, 1] } : undefined}
        transition={urgent ? { repeat: Infinity, duration: 1 } : undefined}
      >
        {mmss(left)}
      </motion.div>
    </div>
  );
}

/** A thin bar that empties as a vote runs out. */
export function DeadlineBar({ deadline, total, color = '#242422' }: { deadline?: number; total: number; color?: string }) {
  const left = useRemaining(deadline, 200);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
      <div className="h-full rounded-full transition-[width] duration-200 ease-linear" style={{ width: `${(left / total) * 100}%`, background: color }} />
    </div>
  );
}

/** Your own tile, face down in the top bar: tap to peek, it turns back by itself. */
export function MyRole({ priv }: { priv: PrivateState | null }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(false), 4000);
    return () => clearTimeout(t);
  }, [open]);
  if (!priv?.role) return null;
  return (
    <div className="relative">
      <motion.button
        type="button"
        className="btn btn-ghost flex h-9 items-center gap-1.5 !px-2 !py-0"
        onClick={() => {
          sfx.flip();
          setOpen((o) => !o);
        }}
        whileTap={{ scale: 0.94 }}
        aria-expanded={open}
        title="Xem vai của bạn"
      >
        <span className="block overflow-hidden rounded-[4px]">
          <CardBack width={20} />
        </span>
        <span className="hidden text-xs sm:inline">Vai của bạn</span>
      </motion.button>
      {open && (
          <motion.div
            className="absolute top-full right-0 z-50 mt-2"
            initial={{ opacity: 0, y: -12, rotateY: 90 }}
            animate={{ opacity: 1, y: 0, rotateY: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            onClick={() => setOpen(false)}
          >
            <div className="rounded-2xl bg-night/95 p-2 shadow-2xl">
              <RoleFace role={priv.role} width={150} />
              {priv.word && (
                <div className="mt-2 rounded-xl bg-paper px-3 py-2 text-center">
                  <div className="label">Từ khóa</div>
                  <div className="display text-xl font-bold uppercase text-vermilion">{priv.word}</div>
                </div>
              )}
            </div>
          </motion.div>
        )}
    </div>
  );
}
