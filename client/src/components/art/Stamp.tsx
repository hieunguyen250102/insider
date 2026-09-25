/**
 * The Master's answers as rubber stamps: CÓ, KHÔNG, KHÔNG BIẾT, ĐÚNG RỒI!
 * A fresh answer slams down (big, tilted, then settles); old ones just sit.
 */

import { motion } from 'framer-motion';
import type { Answer } from '@shared/types';
import { ANSWERS } from '../../lib/theme';

interface Props {
  answer: Answer;
  /** a wrong guess reads SAI rather than KHÔNG */
  guess?: boolean;
  fresh?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: 'text-[11px] px-1.5 py-0.5 border-[1.5px]',
  md: 'text-sm px-2 py-0.5 border-2',
  lg: 'text-3xl px-4 py-1.5 border-[3.5px]',
};

export function Stamp({ answer, guess = false, fresh = false, size = 'md' }: Props) {
  const meta = ANSWERS[answer];
  const label = guess && answer === 'no' ? 'Sai' : meta.label;
  const tilt = answer === 'no' ? 6 : answer === 'yes' ? -6 : answer === 'correct' ? -3 : 4;
  return (
    <motion.span
      className={`display inline-block whitespace-nowrap rounded-md font-bold uppercase leading-tight tracking-wider ${SIZES[size]}`}
      style={{ color: meta.color, borderColor: meta.color, background: 'rgba(251,246,234,0.6)' }}
      initial={fresh ? { scale: 2.4, rotate: tilt * 3, opacity: 0 } : false}
      animate={{ scale: 1, rotate: tilt, opacity: 1 }}
      transition={fresh ? { type: 'spring', stiffness: 520, damping: 17 } : { duration: 0 }}
    >
      {label}
    </motion.span>
  );
}
