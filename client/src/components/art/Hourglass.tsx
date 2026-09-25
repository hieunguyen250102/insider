/**
 * The five-minute hourglass from the kit, redrawn: red lacquer caps, clear
 * glass, cream sand. The sand level follows the server's deadline; when the
 * keyword is found the glass is turned over (the discussion runs as long as
 * the questions took), and in the last seconds it trembles.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { INK, RED } from '../../lib/theme';

const GLASS = 'M22 18 C20 50 44 70 46.5 85 C44 100 20 120 22 152 L78 152 C80 120 56 100 53.5 85 C56 70 80 50 78 18 Z';
const SAND = '#dcb461';
const SAND_DARK = '#b98f45';

interface Props {
  /** share of the sand still in the upper bulb, 0–1 */
  fraction: number;
  running: boolean;
  /** how many times the glass has been turned over */
  turns?: number;
  height?: number;
  urgent?: boolean;
  className?: string;
}

export function Hourglass({ fraction, running, turns = 0, height = 96, urgent = false, className = '' }: Props) {
  // While the glass turns over, the sand is drawn as it lay before the turn
  // (the fallen pile rides up to the top); once it has turned, it is redrawn
  // upright and starts running again. A glass that mounts already turned
  // plays the turn once.
  const [settled, setSettled] = useState(0);
  // Animation callbacks don't fire in hidden tabs, so settle on a timer too.
  useEffect(() => {
    const t = setTimeout(() => setSettled(turns), 1500);
    return () => clearTimeout(t);
  }, [turns]);
  const clamped = Math.min(1, Math.max(0, fraction));
  const upright = settled % 2 === turns % 2;
  const f = upright ? clamped : 1 - clamped;
  const flowing = running && upright;
  const surface = 85 - f * 57;
  const pile = (1 - f) * 52;
  const pileTop = 150 - pile * 1.15;
  const clip = 'hourglass-clip';

  return (
    <motion.div
      className={`inline-block ${className}`}
      style={{ height, width: (height * 100) / 170 }}
      animate={{ rotate: turns * 180 }}
      transition={{ type: 'spring', stiffness: 90, damping: 13 }}
      onAnimationComplete={() => setSettled(turns)}
    >
      <div className={urgent ? 'tremble h-full w-full' : 'h-full w-full'}>
        <svg viewBox="0 0 100 170" width="100%" height="100%" role="img" aria-label="Đồng hồ cát">
          <defs>
            <clipPath id={clip}>
              <path d={GLASS} />
            </clipPath>
          </defs>
          <path d={GLASS} fill="#ffffff" opacity="0.38" />
          <g clipPath={`url(#${clip})`} transform={settled % 2 ? 'rotate(180 50 85)' : undefined}>
            {f > 0.001 && (
              <path d={`M0 ${surface} Q50 ${surface + (flowing ? 5 : 0)} 100 ${surface} L100 86 L0 86 Z`} fill={SAND} />
            )}
            {pile > 0.5 && (
              <path d={`M8 153 L8 ${150 - pile * 0.35} Q50 ${pileTop - 4} 92 ${150 - pile * 0.35} L92 153 Z`} fill={SAND_DARK} />
            )}
            {pile > 0.5 && (
              <path d={`M20 153 L20 ${150 - pile * 0.45} Q50 ${pileTop} 80 ${150 - pile * 0.45} L80 153 Z`} fill={SAND} />
            )}
            {flowing && f > 0.001 && (
              <line
                x1="50"
                y1="84"
                x2="50"
                y2={Math.max(88, pileTop)}
                stroke={SAND_DARK}
                strokeWidth="2"
                strokeDasharray="2 4"
                strokeLinecap="round"
                className="sand-stream"
              />
            )}
          </g>
          <path d="M27 24 C26 46 40 64 43 78" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
          <path d={GLASS} fill="none" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          {/* lacquered caps */}
          {[4, 152].map((y) => (
            <g key={y}>
              <rect x="8" y={y} width="84" height="14" rx="5" fill={RED} stroke={INK} strokeWidth="3" />
              <rect x="14" y={y + 3.5} width="72" height="3" rx="1.5" fill="#ffffff" opacity="0.28" />
            </g>
          ))}
        </svg>
      </div>
    </motion.div>
  );
}
