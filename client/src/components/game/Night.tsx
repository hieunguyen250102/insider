/**
 * "Everybody close your eyes": the scripted start of a round. Everyone turns
 * over their tile; the Master reads the keyword off the card; the Master
 * closes their eyes and the Insider peeks; then everyone opens their eyes.
 * Every screen runs the same script on the same clock, so nobody's screen
 * gives away who is looking — only what is shown differs.
 */

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { GameState, PrivateState } from '@shared/types';
import { REVEAL } from '@shared/timing';
import { CardBack, FlipCard, RoleFace } from '../art/RoleCard';
import { KeywordBack, KeywordCard } from '../art/KeywordCard';
import { Avatar } from '../art/Avatar';
import { useElapsed } from '../../lib/clock';
import { sfx } from '../../lib/sound';
import { CREAM, INK, RED, ROLES } from '../../lib/theme';

const LID = '#1a1816';

/** An almond eye whose lid comes down (closed) or lifts (open). */
function BigEye({ open, width = 170 }: { open: boolean; width?: number }) {
  return (
    <svg viewBox="0 0 200 120" width={width} height={width * 0.6} aria-hidden>
      <defs>
        <clipPath id="night-eye">
          <path d="M8 60 Q100 -14 192 60 Q100 134 8 60Z" />
        </clipPath>
      </defs>
      <path d="M8 60 Q100 -14 192 60 Q100 134 8 60Z" fill={CREAM} />
      <g clipPath="url(#night-eye)">
        <motion.g animate={open ? { x: [0, -14, 14, 0] } : { x: 0 }} transition={{ duration: 2.4, delay: 0.5, ease: 'easeInOut' }}>
          <circle cx="100" cy="60" r="31" fill={RED} />
          <circle cx="100" cy="60" r="15" fill={INK} />
          <circle cx="92" cy="51" r="5.5" fill={CREAM} />
        </motion.g>
        <motion.rect
          x="0"
          y="-14"
          width="200"
          height="150"
          fill={LID}
          style={{ originY: 0 }}
          initial={false}
          animate={{ scaleY: open ? 0 : 1 }}
          transition={{ duration: 0.55, ease: [0.5, 0, 0.3, 1] }}
        />
      </g>
      <path d="M8 60 Q100 -14 192 60 Q100 134 8 60Z" fill="none" stroke={CREAM} strokeWidth="4" />
      {!open && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} stroke={CREAM} strokeWidth="4" strokeLinecap="round">
            <path d="M8 60 Q100 134 192 60" fill="none" />
            {[40, 70, 100, 130, 160].map((x, i) => {
              const y = 60 + Math.sin((x / 200) * Math.PI) * 37;
              return <line key={x} x1={x} y1={y} x2={x + (i - 2) * 4} y2={y + 14} />;
            })}
          </motion.g>
        )}
    </svg>
  );
}

function stepOf(elapsed: number): 0 | 1 | 2 | 3 {
  if (elapsed < REVEAL.master) return 0;
  if (elapsed < REVEAL.insider) return 1;
  if (elapsed < REVEAL.open) return 2;
  return 3;
}

const HEADLINES = ['Nhận vai', 'Mọi người nhắm mắt…', 'Quản trò nhắm mắt · Nội gián mở mắt', 'Mở mắt!'];

export function Night({ state, priv }: { state: GameState; priv: PrivateState | null }) {
  const elapsed = useElapsed(state.phaseStartedAt, true, 150);
  const step = stepOf(elapsed);
  const role = priv?.role ?? null;
  const master = state.players.find((p) => p.id === state.masterId);

  useEffect(() => {
    if (step === 0) sfx.flip();
    if (step === 1) sfx.eyesClose();
    if (step === 2) sfx.whoosh();
    if (step === 3) sfx.eyesOpen();
  }, [step]);

  let body: React.ReactNode;
  if (step === 0) {
    body = (
      <div className="flex flex-col items-center">
        {role ? (
          <FlipCard flipped={elapsed > 700} width={170} back={<CardBack width={170} />} front={<RoleFace role={role} width={170} />} />
        ) : (
          <CardBack width={170} label="CHỜ VÁN SAU" />
        )}
        <motion.p
          className="display mt-5 text-2xl font-bold uppercase tracking-wide"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          style={{ color: role ? ROLES[role].color : CREAM }}
        >
          {role ? `Bạn là ${ROLES[role].label}` : 'Bạn xem ván này'}
        </motion.p>
        {master && (
          <motion.p className="mt-2 flex items-center gap-2 text-sm text-paper/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}>
            <Avatar id={master.avatar} size={26} /> <b className="text-paper">{master.name}</b> là Quản trò
          </motion.p>
        )}
      </div>
    );
  } else if (step === 1 && role === 'master' && priv?.card) {
    body = (
      <div className="flex flex-col items-center">
        <div className="flex items-end gap-3">
          <motion.div initial={{ x: 60, opacity: 0, rotate: 8 }} animate={{ x: 0, opacity: 1, rotate: -4 }} transition={{ type: 'spring', stiffness: 160, damping: 16 }}>
            <KeywordBack n={priv.card.row} width={78} />
          </motion.div>
          <motion.div initial={{ y: 40, opacity: 0, rotate: -6 }} animate={{ y: 0, opacity: 1, rotate: 1 }} transition={{ delay: 0.25, type: 'spring', stiffness: 160, damping: 16 }}>
            <KeywordCard id={priv.card.id} words={priv.card.words} row={priv.card.row} width={230} />
          </motion.div>
        </div>
        <p className="mt-4 text-sm text-paper/70">Số {priv.card.row} ở mặt sau thẻ kế tiếp chọn dòng {priv.card.row}. Từ khóa là</p>
        <motion.p
          className="display mt-1 text-4xl font-bold uppercase tracking-wide text-mustard"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.9, type: 'spring', stiffness: 260, damping: 14 }}
        >
          {priv.word}
        </motion.p>
      </div>
    );
  } else if (step === 2 && role === 'insider' && priv?.word) {
    body = (
      <div className="flex flex-col items-center">
        <BigEye open width={190} />
        <p className="mt-4 text-sm uppercase tracking-[0.3em] text-paper/60">Suỵt… từ khóa là</p>
        <motion.p
          className="display mt-1 text-5xl font-bold uppercase tracking-wide text-vermilion"
          initial={{ filter: 'blur(8px)', opacity: 0 }}
          animate={{ filter: 'blur(0px)', opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {priv.word}
        </motion.p>
        <p className="mt-3 max-w-xs text-center text-xs text-paper/55">Ghi nhớ rồi nhắm mắt lại. Đừng để ai biết bạn đã nhìn!</p>
      </div>
    );
  } else if (step === 3) {
    body = (
      <div className="flex flex-col items-center">
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: [0.8, 1.12, 1] }} transition={{ duration: 0.6 }}>
          <BigEye open width={190} />
        </motion.div>
        <p className="mt-4 text-sm text-paper/70">Đồng hồ cát bắt đầu chảy — hỏi Quản trò đi!</p>
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col items-center">
        <BigEye open={false} width={190} />
        <p className="mt-5 max-w-xs text-center text-sm text-paper/60">
          {step === 1 ? 'Quản trò đang xem từ khóa…' : role === 'master' ? 'Nhắm mắt nhé. Nội gián đang lén xem từ khóa…' : 'Ai đó đang lén mở mắt…'}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto px-4 py-10"
      style={{ background: 'radial-gradient(90% 70% at 50% 40%, #2a2521 0%, #151311 75%)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="mb-6 flex items-center gap-2">
        {HEADLINES.map((_, i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-mustard' : i < step ? 'w-3 bg-paper/50' : 'w-3 bg-paper/15'}`} />
        ))}
      </div>
      <motion.h2
        key={step}
        className="display mb-6 text-center text-3xl font-bold uppercase tracking-wide text-paper sm:text-4xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {HEADLINES[step]}
      </motion.h2>
      <motion.div
        key={`${step}-${role === 'master' && step === 1 ? 'm' : role === 'insider' && step === 2 ? 'i' : 'x'}`}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
      >
        {body}
      </motion.div>
    </motion.div>
  );
}
