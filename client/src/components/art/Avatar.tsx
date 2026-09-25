/**
 * The eight characters at the table: flat screen-print faces with a hat or
 * a haircut each. They blink now and then, close their eyes at "night",
 * and pull a face when the round ends.
 */

import { memo } from 'react';
import { avatarOf, INK } from '../../lib/theme';

export type Eyes = 'open' | 'closed';
export type Mood = 'calm' | 'happy' | 'sad' | 'shock';

interface Props {
  id: number;
  size?: number;
  eyes?: Eyes;
  mood?: Mood;
  className?: string;
  title?: string;
}

function Hair({ id, coat }: { id: number; coat: string }) {
  switch (id % 8) {
    case 0: // fedora
      return (
        <g>
          <path d="M20 22 Q21 8 32 8.5 Q43 8 44 22 Z" fill={INK} />
          <rect x="20.5" y="17" width="23" height="3.6" fill={coat} />
          <ellipse cx="32" cy="22" rx="19" ry="3.6" fill={INK} />
        </g>
      );
    case 1: // beret
      return (
        <g>
          <path d="M19 30 Q19 22 24 20 L24 27 Q21 28 19 30Z" fill={INK} />
          <path d="M16 22 Q17 10 33 10.5 Q49 11.5 47 20 Q39 24.5 29 23.5 Q21 24 16 22Z" fill="#d83d31" />
          <rect x="31" y="6.5" width="2.4" height="5" rx="1.2" fill="#d83d31" />
        </g>
      );
    case 2: // bob
      return (
        <path
          d="M17.5 41 Q15 15 32 15 Q49 15 46.5 41 Q43.5 40 43.5 31 Q39 25 30 25.5 Q24 26 21 29 Q20.5 39 17.5 41Z"
          fill={INK}
        />
      );
    case 3: // cap
      return (
        <g>
          <path d="M19 26 Q19.5 12.5 32 12.5 Q44.5 12.5 45 26 Z" fill="#e2a93b" />
          <path d="M32 24.5 Q46 23 53 27.5 Q45 29.5 32 27Z" fill="#b98524" />
          <circle cx="32" cy="13.5" r="1.6" fill="#b98524" />
        </g>
      );
    case 4: // top bun
      return (
        <g>
          <circle cx="32" cy="11" r="6.5" fill={INK} />
          <path d="M18.5 31 Q18 17 32 17 Q46 17 45.5 31 Q41 22.5 32 22.5 Q23 22.5 18.5 31Z" fill={INK} />
        </g>
      );
    case 5: // bowler + moustache
      return (
        <g>
          <path d="M22 22 Q22 9 32 9 Q42 9 42 22 Z" fill={INK} />
          <ellipse cx="32" cy="22" rx="16.5" ry="3.2" fill={INK} />
          <path d="M26.5 38.5 Q29.5 35.8 32 37.4 Q34.5 35.8 37.5 38.5 Q34.5 39.8 32 38.6 Q29.5 39.8 26.5 38.5Z" fill={INK} />
        </g>
      );
    case 6: // side part + round glasses
      return (
        <g>
          <path d="M18.5 29 Q19 15.5 34 16.5 Q46 17.5 45.5 29 Q38.5 21 27 23.5 Q22 25 18.5 29Z" fill={INK} />
          <g fill="none" stroke={INK} strokeWidth="1.4">
            <circle cx="27" cy="33" r="4.2" />
            <circle cx="37" cy="33" r="4.2" />
            <path d="M31.2 32.6 Q32 31.8 32.8 32.6" />
          </g>
        </g>
      );
    default: // curls
      return (
        <g fill={INK}>
          {[
            [20, 25, 5],
            [24, 18.5, 5.5],
            [31, 15.5, 6],
            [38.5, 17.5, 5.5],
            [44, 24, 5],
            [18.5, 31, 3.6],
            [45.5, 30.5, 3.6],
          ].map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} />
          ))}
        </g>
      );
  }
}

function Face({ eyes, mood, blinkDelay, glasses }: { eyes: Eyes; mood: Mood; blinkDelay: number; glasses: boolean }) {
  const eyeY = 33;
  return (
    <g>
      {eyes === 'closed' ? (
        <g fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round">
          <path d={`M24.5 ${eyeY} Q27 ${eyeY + 2} 29.5 ${eyeY}`} />
          <path d={`M34.5 ${eyeY} Q37 ${eyeY + 2} 39.5 ${eyeY}`} />
        </g>
      ) : (
        <g fill={INK} className="blink" style={{ animationDelay: `${-blinkDelay}s` }}>
          <ellipse cx="27" cy={eyeY} rx={glasses ? 1.5 : 1.8} ry={mood === 'shock' ? 2.6 : 2.1} />
          <ellipse cx="37" cy={eyeY} rx={glasses ? 1.5 : 1.8} ry={mood === 'shock' ? 2.6 : 2.1} />
        </g>
      )}
      {mood === 'happy' ? (
        <path d="M27.5 39.5 Q32 44.5 36.5 39.5 Z" fill={INK} />
      ) : mood === 'sad' ? (
        <path d="M28.5 42.5 Q32 39.5 35.5 42.5" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      ) : mood === 'shock' ? (
        <ellipse cx="32" cy="41.5" rx="2" ry="2.6" fill={INK} />
      ) : (
        <path d="M29 40.5 Q32 42.5 35 40.5" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      )}
    </g>
  );
}

export const Avatar = memo(function Avatar({ id, size = 48, eyes = 'open', mood = 'calm', className = '', title }: Props) {
  const a = avatarOf(id);
  const clip = `av-clip-${id}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label={title ?? a.name}>
      <defs>
        <clipPath id={clip}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="64" height="64" fill="#fbf6ea" />
        <rect width="64" height="64" fill={a.coat} opacity="0.22" />
        {/* trench-coat shoulders and collar */}
        <path d="M6 66 Q8 51 22 48 L32 55 L42 48 Q56 51 58 66Z" fill={a.coat} />
        <path d="M22 48 L32 55 L27 60 L19.5 50Z M42 48 L32 55 L37 60 L44.5 50Z" fill={a.shade} />
        <rect x="28.5" y="43" width="7" height="8" fill={a.skin} />
        <ellipse cx="32" cy="32" rx="13" ry="14" fill={a.skin} />
        <circle cx="23.5" cy="38" r="2.2" fill={a.coat} opacity="0.28" />
        <circle cx="40.5" cy="38" r="2.2" fill={a.coat} opacity="0.28" />
        <Face eyes={eyes} mood={mood} blinkDelay={(id * 1.7) % 5} glasses={id % 8 === 6} />
        <Hair id={id} coat={a.shade} />
      </g>
    </svg>
  );
});
