/**
 * The role tiles, redrawn: a desk lamp over the answer for the Master, the
 * watching eye under a fedora for the Insider, a crowd with a question for
 * the Commons. Plus the shared back, and a 3-D flip between the two.
 */

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import type { Role } from '@shared/types';
import { CREAM, INK, MUSTARD, PAPER, RED, ROLES, TEAL } from '../../lib/theme';

function MasterArt() {
  return (
    <g>
      {/* lamp light falling on the answer card */}
      <path d="M78 92 L42 176 L158 176 L122 92Z" fill={MUSTARD} opacity="0.32" />
      <path d="M70 60 L100 30 L132 52" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="100" cy="30" r="6" fill={INK} />
      <path d="M62 94 Q70 58 100 62 Q130 58 138 94Z" fill={TEAL} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <rect x="126" y="48" width="14" height="8" rx="3" fill={INK} transform="rotate(35 133 52)" />
      <ellipse cx="100" cy="94" rx="22" ry="5" fill={CREAM} stroke={INK} strokeWidth="3" />
      {/* the card with the answer */}
      <rect x="70" y="140" width="60" height="38" rx="6" fill={CREAM} stroke={INK} strokeWidth="4" />
      <path d="M86 159 L96 168 L115 150" fill="none" stroke={TEAL} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function InsiderArt({ lookAround }: { lookAround: boolean }) {
  return (
    <g>
      {/* fedora */}
      <path d="M62 74 Q64 34 100 34 Q136 34 138 74Z" fill={INK} />
      <rect x="63" y="62" width="74" height="10" fill={RED} />
      <ellipse cx="100" cy="76" rx="62" ry="10" fill={INK} />
      {/* the eye */}
      <path d="M36 128 L100 90 L164 128 L100 166Z" fill={RED} />
      <circle cx="100" cy="128" r="25" fill={CREAM} />
      <motion.g
        animate={lookAround ? { x: [0, -9, -9, 8, 8, 0], y: [0, 1, 1, -1, -1, 0] } : undefined}
        transition={{ duration: 4.2, repeat: Infinity, times: [0, 0.15, 0.4, 0.55, 0.85, 1], ease: 'easeInOut' }}
      >
        <circle cx="100" cy="128" r="12" fill={INK} />
        <circle cx="95" cy="123" r="3.5" fill={CREAM} />
      </motion.g>
      <path d="M36 128 L100 90 L164 128" fill="none" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
    </g>
  );
}

function CommonArt() {
  const person = (x: number, y: number, s: number, fill: string) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx="0" cy="-26" r="15" fill={fill} stroke={INK} strokeWidth="3.5" />
      <path d="M-26 22 Q-24 -8 0 -8 Q24 -8 26 22Z" fill={fill} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
    </g>
  );
  return (
    <g>
      {person(62, 150, 0.9, '#3561a6')}
      {person(138, 150, 0.9, TEAL)}
      {person(100, 160, 1.05, MUSTARD)}
      {/* speech bubble with a question */}
      <path d="M112 38 H168 Q176 38 176 46 V76 Q176 84 168 84 H138 L126 96 L128 84 H112 Q104 84 104 76 V46 Q104 38 112 38Z" fill={CREAM} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <text x="140" y="75" textAnchor="middle" fontFamily="Oswald, sans-serif" fontWeight="700" fontSize="38" fill={RED}>
        ?
      </text>
    </g>
  );
}

/** The face of a role tile, 200×280. */
export function RoleFace({ role, width = 150, lookAround = true }: { role: Role; width?: number; lookAround?: boolean }) {
  const meta = ROLES[role];
  return (
    <svg width={width} height={(width * 280) / 200} viewBox="0 0 200 280" role="img" aria-label={meta.label}>
      <rect x="2" y="2" width="196" height="276" rx="16" fill={PAPER} stroke={INK} strokeWidth="3" />
      <rect x="2" y="2" width="196" height="14" rx="7" fill={meta.color} />
      <text x="16" y="38" fontFamily="Oswald, sans-serif" fontWeight="700" fontSize="15" letterSpacing="1.5" fill={RED}>
        NỘI GIÁN
      </text>
      <text x="184" y="38" textAnchor="end" fontFamily="Be Vietnam Pro, sans-serif" fontWeight="600" fontSize="10" letterSpacing="1" fill="#8a8173">
        VAI TRÒ
      </text>
      <line x1="16" y1="46" x2="184" y2="46" stroke={INK} strokeWidth="1.5" />
      <g transform="translate(0 6) scale(1 0.92)">{role === 'master' ? <MasterArt /> : role === 'insider' ? <InsiderArt lookAround={lookAround} /> : <CommonArt />}</g>
      <rect x="16" y="200" width="168" height="36" rx="8" fill={meta.color} />
      <text x="100" y="226" textAnchor="middle" fontFamily="Oswald, sans-serif" fontWeight="700" fontSize="24" letterSpacing="2" fill={role === 'common' ? INK : CREAM}>
        {meta.label.toUpperCase()}
      </text>
      <text x="100" y="256" textAnchor="middle" fontFamily="Be Vietnam Pro, sans-serif" fontSize="10.5" fill={INK}>
        {meta.lines[0]}
      </text>
      <text x="100" y="270" textAnchor="middle" fontFamily="Be Vietnam Pro, sans-serif" fontSize="10.5" fill="#5b5347">
        {meta.lines[1]}
      </text>
    </svg>
  );
}

/** The shared back of every role tile: charcoal, a cream frame, a red question mark. */
export function CardBack({ width = 150, label = 'VAI TRÒ BÍ MẬT' }: { width?: number; label?: string }) {
  return (
    <svg width={width} height={(width * 280) / 200} viewBox="0 0 200 280" role="img" aria-label="Mặt sau thẻ">
      <defs>
        <pattern id="back-dots" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="5" cy="5" r="1.3" fill={PAPER} opacity="0.12" />
        </pattern>
      </defs>
      <rect x="2" y="2" width="196" height="276" rx="16" fill={INK} stroke="#000" strokeWidth="3" />
      <rect x="2" y="2" width="196" height="276" rx="16" fill="url(#back-dots)" />
      <rect x="14" y="14" width="172" height="252" rx="10" fill="none" stroke={PAPER} strokeWidth="2.5" />
      <text x="100" y="62" textAnchor="middle" fontFamily="Oswald, sans-serif" fontWeight="700" fontSize="26" letterSpacing="3" fill={PAPER}>
        NỘI GIÁN
      </text>
      <circle cx="100" cy="148" r="54" fill={RED} />
      <text x="100" y="178" textAnchor="middle" fontFamily="Oswald, sans-serif" fontWeight="700" fontSize="90" fill={PAPER}>
        ?
      </text>
      <text x="100" y="238" textAnchor="middle" fontFamily="Oswald, sans-serif" fontWeight="600" fontSize="14" letterSpacing="2.5" fill={PAPER}>
        {label}
      </text>
    </svg>
  );
}

/** Two faces and a 3-D turn between them. */
export function FlipCard({
  flipped,
  front,
  back,
  width,
  delay = 0,
  onFlipped,
}: {
  flipped: boolean;
  front: ReactNode;
  back: ReactNode;
  width: number;
  delay?: number;
  onFlipped?: () => void;
}) {
  const height = (width * 280) / 200;
  return (
    <div className="flip3d" style={{ width, height }}>
      <motion.div
        className="flip3d-inner relative h-full w-full"
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ delay, duration: 0.7, ease: [0.3, 0.9, 0.35, 1] }}
        onAnimationComplete={onFlipped}
      >
        <div className="flip3d-face absolute inset-0">{back}</div>
        <div className="flip3d-face absolute inset-0" style={{ transform: 'rotateY(180deg)' }}>
          {front}
        </div>
      </motion.div>
    </div>
  );
}
