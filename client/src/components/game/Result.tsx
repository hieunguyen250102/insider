/**
 * The end of a round: who won and why, the keyword on its card, and every
 * tile turned over one after another. Winners get their +1.
 */

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { GameState, PrivateState, RoundResult } from '@shared/types';
import { CARDS } from '@shared/words';
import { Avatar } from '../art/Avatar';
import { CardBack, FlipCard, RoleFace } from '../art/RoleCard';
import { KeywordCard } from '../art/KeywordCard';
import { Hourglass } from '../art/Hourglass';
import { EyeMark } from '../Logo';
import { Confetti } from '../Overlays';
import { sfx } from '../../lib/sound';

type Send = (event: string, payload?: object) => void;

function headline(r: RoundResult, name: (id?: string) => string): { title: string; line: string; color: string } {
  if (r.winner === 'none') {
    return { title: 'Hết giờ — cả bàn thua', line: 'Không ai tìm ra từ khóa trước khi cát chảy hết.', color: '#e2a93b' };
  }
  const insider = name(r.insiderId);
  if (r.winner === 'commons') {
    const line =
      r.reason === 'vote1'
        ? `${name(r.guesserId)} bị kết tội — và đúng là Nội gián!`
        : `Cả bàn đã chỉ đúng ${insider}!`;
    return { title: 'Quản trò & Thường dân thắng', line, color: '#2f7f7a' };
  }
  const line =
    r.reason === 'vote1'
      ? r.accusedId
        ? `${name(r.guesserId)} bị kết tội oan. Nội gián thật là ${insider}.`
        : `${insider} đoán ra từ khóa mà cả bàn vẫn tin là vô tội!`
      : `Cả bàn chỉ nhầm ${name(r.accusedId)}. Nội gián thật là ${insider}.`;
  return { title: 'Nội gián thắng', line, color: '#d83d31' };
}

export function Result({ state, youId, send }: { state: GameState; priv: PrivateState | null; youId: string; send: Send }) {
  const r = state.result!;
  const players = new Map(state.players.map((p) => [p.id, p]));
  const name = (id?: string) => (id && players.get(id)?.name) || 'Ai đó';
  const h = headline(r, name);
  const iWon = r.winners.includes(youId);
  const played = youId in r.roles;
  const card = CARDS.find((c) => c.id === r.cardId);
  const isHost = state.hostId === youId;
  const order = Object.keys(r.roles);

  useEffect(() => {
    if (!played) return;
    if (iWon) sfx.win();
    else sfx.lose();
  }, [iWon, played]);

  return (
    <div className="paper scrollbar-thin flex min-h-0 flex-1 flex-col items-center overflow-y-auto rounded-3xl px-4 py-5">
      {iWon && <Confetti seed={state.round} />}
      <motion.div
        className="flex flex-col items-center text-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 15 }}
      >
        {r.winner === 'insider' ? (
          <EyeMark size={70} />
        ) : r.winner === 'none' ? (
          <Hourglass fraction={0} running={false} height={70} />
        ) : (
          <span className="text-5xl" aria-hidden>
            🔎
          </span>
        )}
        <h2 className="display mt-2 text-3xl font-bold uppercase tracking-wide sm:text-4xl" style={{ color: h.color }}>
          {h.title}
        </h2>
        <p className="mt-1 max-w-md text-sm text-ink-soft">{h.line}</p>
        {played && (
          <motion.span
            className="display mt-3 rounded-lg border-[3px] px-3 py-0.5 text-xl font-bold uppercase tracking-widest"
            style={{ color: iWon ? '#2f7f7a' : '#8a8173', borderColor: iWon ? '#2f7f7a' : '#8a8173' }}
            initial={{ scale: 2.4, rotate: -14, opacity: 0 }}
            animate={{ scale: 1, rotate: -4, opacity: 1 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 460, damping: 16 }}
          >
            {iWon ? 'Bạn thắng' : 'Bạn thua'}
          </motion.span>
        )}
      </motion.div>

      <div className="mt-6 flex w-full flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
        {card && (
          <motion.div initial={{ rotate: -6, y: 20, opacity: 0 }} animate={{ rotate: -2, y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            <KeywordCard id={card.id} words={card.words} row={r.row} width={230} />
          </motion.div>
        )}
        <div className="flex max-w-[400px] flex-wrap justify-center gap-x-2 gap-y-4">
          {order.map((id, i) => {
            const p = players.get(id);
            const role = r.roles[id];
            const won = r.winners.includes(id);
            return (
              <div key={id} className="relative flex w-[92px] flex-col items-center">
                <FlipCard flipped delay={0.6 + i * 0.22} width={78} back={<CardBack width={78} />} front={<RoleFace role={role} width={78} lookAround={false} />} onFlipped={i === order.length - 1 ? sfx.flip : undefined} />
                <div className="mt-1.5 flex items-center gap-1">
                  <Avatar id={p?.avatar ?? 0} size={22} mood={won ? 'happy' : 'sad'} />
                  <span className={`max-w-[64px] truncate text-xs font-semibold ${id === youId ? 'text-vermilion' : 'text-ink'}`}>
                    {id === youId ? 'Bạn' : (p?.name ?? '—')}
                  </span>
                </div>
                <span className="text-[10px] text-ink-soft">🏆 {p?.wins ?? 0}</span>
                {won && (
                  <motion.span
                    className="display absolute -top-2 right-0 rounded-md bg-teal px-1.5 text-sm font-bold text-cream"
                    initial={{ y: 12, opacity: 0, scale: 0.6 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ delay: 0.9 + i * 0.22, type: 'spring', stiffness: 400, damping: 14 }}
                  >
                    +1
                  </motion.span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        {isHost ? (
          <>
            <button
              type="button"
              className="btn btn-red text-base"
              onClick={() => {
                sfx.eyesClose();
                send('round:next');
              }}
            >
              Ván tiếp theo
            </button>
            <button type="button" className="btn btn-paper" onClick={() => send('room:lobby')}>
              Về phòng chờ
            </button>
          </>
        ) : (
          <span className="display animate-pulse text-sm uppercase tracking-widest text-ink-soft">Chờ chủ bàn chia ván mới…</span>
        )}
      </div>
    </div>
  );
}
