/**
 * A keyword card as printed in the kit: six numbered words, the chosen row
 * marked with a stroke of highlighter. The number on the next card's back
 * picked that row.
 */

import { motion } from 'framer-motion';

interface Props {
  id: string;
  words: string[];
  /** 1–6 */
  row: number;
  /** animate the highlighter stroke in */
  mark?: boolean;
  width?: number;
}

export function KeywordCard({ id, words, row, mark = true, width = 260 }: Props) {
  const s = width / 260;
  return (
    <div
      className="paper relative overflow-hidden rounded-2xl text-ink"
      style={{ width, padding: `${16 * s}px ${16 * s}px ${12 * s}px` }}
    >
      <div className="absolute inset-x-0 top-0 bg-vermilion" style={{ height: 8 * s }} />
      <div className="flex items-baseline justify-between" style={{ marginTop: 4 * s }}>
        <span className="display font-bold text-vermilion" style={{ fontSize: 17 * s, letterSpacing: '0.08em' }}>
          NỘI GIÁN
        </span>
        <span className="font-semibold text-muted" style={{ fontSize: 10 * s, letterSpacing: '0.1em' }}>
          THẺ {id}
        </span>
      </div>
      <div className="bg-ink" style={{ height: 1.5 * s, margin: `${8 * s}px 0 ${6 * s}px` }} />
      <ol>
        {words.map((w, i) => {
          const chosen = i + 1 === row;
          return (
            <li
              key={w}
              className="relative flex items-center"
              style={{ gap: 10 * s, padding: `${5 * s}px 0`, borderTop: i ? '1px solid rgba(36,36,34,0.1)' : undefined }}
            >
              {chosen && mark && (
                <motion.span
                  className="absolute rounded-md bg-mustard/70"
                  style={{ left: 34 * s, right: 0, top: 4 * s, bottom: 4 * s, originX: 0 }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.45, duration: 0.5, ease: 'easeOut' }}
                />
              )}
              <span
                className="display relative flex shrink-0 items-center justify-center rounded-full font-bold"
                style={{
                  width: 24 * s,
                  height: 24 * s,
                  fontSize: 13 * s,
                  background: chosen ? '#242422' : '#d83d31',
                  color: '#fbf6ea',
                }}
              >
                {i + 1}
              </span>
              <span
                className={`relative truncate ${chosen ? 'font-bold' : 'text-ink-soft'}`}
                style={{ fontSize: (chosen ? 17 : 15) * s }}
              >
                {w}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** The back of a keyword card: the number that picks a row. */
export function KeywordBack({ n, width = 120 }: { n: number; width?: number }) {
  const s = width / 120;
  return (
    <div
      className="relative flex flex-col items-center justify-between rounded-2xl bg-vermilion text-cream"
      style={{ width, height: width * 1.4, padding: 10 * s, boxShadow: '0 14px 28px -18px rgba(0,0,0,0.8)' }}
    >
      <div className="absolute rounded-xl border-cream/90" style={{ inset: 7 * s, borderWidth: 2 * s }} />
      <span className="display relative font-bold" style={{ fontSize: 13 * s, letterSpacing: '0.12em' }}>
        NỘI GIÁN
      </span>
      <span className="display relative font-bold leading-none" style={{ fontSize: 70 * s }}>
        {n}
      </span>
      <span className="display relative font-semibold" style={{ fontSize: 10 * s, letterSpacing: '0.12em' }}>
        SỐ CHỌN TỪ
      </span>
    </div>
  );
}
