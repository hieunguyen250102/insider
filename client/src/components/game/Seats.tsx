/**
 * Everybody at the table in a row: their character, what the table knows
 * of their role, and whether they have voted or are ready. A fresh chat
 * line briefly replaces the name, like a speech bubble.
 */

import { motion } from 'framer-motion';
import type { GameState, PublicPlayer } from '@shared/types';
import { Avatar, type Mood } from '../art/Avatar';
import { RoleChip } from './Bits';
import type { ChatItem } from '../Chat';
import { useTick } from '../../lib/hooks';
import { avatarOf } from '../../lib/theme';

const BUBBLE_MS = 6000;

interface Props {
  state: GameState;
  youId: string;
  chat: ChatItem[];
}

function moodOf(p: PublicPlayer, state: GameState): Mood {
  const res = state.result;
  if (state.phase === 'result' && res && p.inRound) return res.winners.includes(p.id) ? 'happy' : 'sad';
  if (state.phase === 'vote1' && state.vote1 && p.id === state.guesserId) return 'shock';
  if (state.phase === 'discussion' && p.id === state.guesserId) return 'happy';
  return 'calm';
}

export function Seats({ state, youId, chat }: Props) {
  const now = Date.now();
  const recent = chat.filter((m) => !m.system && m.recvAt && now - m.recvAt < BUBBLE_MS);
  useTick(1000, recent.length > 0);
  const night = state.phase === 'reveal';

  return (
    <div className="scrollbar-none flex gap-1.5 overflow-x-auto px-1 pb-1 sm:justify-center">
      {state.players.map((p) => {
        const said = [...recent].reverse().find((m) => m.playerId === p.id);
        const tick = p.voted || p.ready;
        const guesser = p.id === state.guesserId && state.phase !== 'lobby';
        return (
          <motion.div
            key={p.id}
            layout
            className={`relative flex w-[76px] shrink-0 flex-col items-center rounded-2xl px-1 pt-1.5 pb-1 ${
              p.id === youId ? 'bg-paper/10' : ''
            } ${p.inRound || state.phase === 'lobby' ? '' : 'opacity-45'}`}
          >
            <div className="relative">
              <motion.div
                animate={guesser ? { y: [0, -4, 0] } : { y: 0 }}
                transition={guesser ? { repeat: Infinity, duration: 1.6, ease: 'easeInOut' } : undefined}
                className={p.connected ? '' : 'grayscale'}
              >
                <Avatar id={p.avatar} size={50} eyes={night ? 'closed' : 'open'} mood={moodOf(p, state)} />
              </motion.div>
              {guesser && (
                <span className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-mustard text-[11px] shadow" title="Người đoán ra từ khóa">
                  ★
                </span>
              )}
              {tick && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-teal text-[11px] font-bold text-cream shadow"
                    title={p.voted ? 'Đã bỏ phiếu' : 'Sẵn sàng'}
                  >
                    ✓
                  </motion.span>
                )}
              {!p.connected && (
                <span className="absolute -bottom-0.5 -right-1 rounded bg-night px-1 text-[9px] font-semibold text-paper/80">mất mạng</span>
              )}
              {p.isBot && p.connected && (
                <span className="absolute -bottom-0.5 -right-1 rounded bg-night/85 px-1 text-[9px] font-semibold text-paper/80">bot</span>
              )}
            </div>

            <div className="relative mt-1 flex h-[32px] w-full flex-col items-center justify-start">
              {said ? (
                  <motion.div
                    key={`said-${said.id}`}
                    initial={{ opacity: 0, y: 6, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="line-clamp-2 w-[74px] break-words rounded-lg rounded-tl-sm px-1 py-0.5 text-center text-[9.5px] leading-[1.2] text-ink shadow"
                    style={{ background: '#fbf6ea', borderLeft: `3px solid ${avatarOf(p.avatar).coat}` }}
                  >
                    {said.text}
                  </motion.div>
                ) : (
                  <motion.div key="name" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-0.5">
                    <span className={`max-w-[72px] truncate text-[11px] font-semibold ${p.id === youId ? 'text-mustard' : 'text-paper/85'}`}>
                      {p.name}
                    </span>
                    {p.role && <RoleChip role={p.role} />}
                  </motion.div>
                )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
