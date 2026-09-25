/**
 * The hourglass has been turned over. The keyword is out and so is who
 * found it; now the table reads back the questions and argues about who
 * knew too much. Everyone ready → straight to the vote.
 */

import { motion } from 'framer-motion';
import type { GameState, PrivateState } from '@shared/types';
import { Avatar } from '../art/Avatar';
import { HourglassHeader } from './Bits';
import { QAFeed } from './QAPanel';
import { sfx } from '../../lib/sound';

type Send = (event: string, payload?: object) => void;

/** How each player's questions went, the thing people argue from. */
function Tally({ state }: { state: GameState }) {
  const rows = state.players
    .filter((p) => p.inRound && p.id !== state.masterId)
    .map((p) => {
      const asks = state.questions.filter((q) => q.playerId === p.id && q.kind === 'ask');
      return {
        p,
        asks: asks.length,
        yes: asks.filter((q) => q.answer === 'yes').length,
        guesses: state.questions.filter((q) => q.playerId === p.id && q.kind === 'guess').length,
      };
    });
  return (
    <div className="scrollbar-none flex gap-1.5 overflow-x-auto border-b border-ink/10 px-3 py-2">
      {rows.map(({ p, asks, yes, guesses }) => (
        <div key={p.id} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/55 px-2 py-1" title={`${asks} câu hỏi, ${yes} câu được “Có”, ${guesses} lần đoán`}>
          <Avatar id={p.avatar} size={22} />
          <span className="max-w-[70px] truncate text-[11px] font-semibold text-ink">{p.name}</span>
          <span className="text-[10px] tabular-nums text-ink-soft">
            {asks}❓ <span className="text-teal">{yes}✓</span> {guesses > 0 && <>{guesses}🎯</>}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Discussion({ state, priv, youId, send }: { state: GameState; priv: PrivateState | null; youId: string; send: Send }) {
  const me = state.players.find((p) => p.id === youId);
  const guesser = state.players.find((p) => p.id === state.guesserId);
  const inRound = state.players.filter((p) => p.inRound);
  const readyCount = inRound.filter((p) => p.ready).length;

  const aside = (
    <div className="hidden shrink-0 flex-col items-center rounded-2xl bg-ink px-4 py-2 text-center sm:flex">
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-paper/60">Từ khóa</span>
      <motion.span
        className="display text-2xl font-bold uppercase tracking-wide text-mustard"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14 }}
      >
        {state.word}
      </motion.span>
    </div>
  );

  return (
    <div className="paper flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl">
      <HourglassHeader
        state={state}
        title="Thảo luận"
        aside={aside}
        hint={
          <>
            <span className="sm:hidden">
              Từ khóa: <b className="uppercase text-vermilion">{state.word}</b>.{' '}
            </span>
            {guesser && (
              <>
                <b className="text-ink">{guesser.name}</b> đã đoán ra.{' '}
              </>
            )}
            Ai hỏi “trúng” quá? Ai biết trước đáp án?
          </>
        }
      />
      <Tally state={state} />
      <QAFeed state={state} priv={priv} youId={youId} empty="Không có câu hỏi nào — đoán trúng ngay từ đầu, đáng ngờ chưa!" />
      <div className="flex flex-wrap items-center gap-3 border-t border-ink/10 px-4 py-3">
        <div className="flex -space-x-2">
          {inRound.map((p) => (
            <motion.span key={p.id} animate={{ y: p.ready ? -4 : 0, opacity: p.ready ? 1 : 0.35 }} title={p.name}>
              <Avatar id={p.avatar} size={28} />
            </motion.span>
          ))}
        </div>
        <span className="text-xs text-ink-soft">
          {readyCount}/{inRound.length} sẵn sàng bỏ phiếu
        </span>
        {me?.inRound && (
          <button
            type="button"
            onClick={() => {
              sfx.select();
              send('discuss:ready', { ready: !me.ready });
            }}
            className={`btn ml-auto ${me.ready ? 'btn-paper' : 'btn-red'}`}
          >
            {me.ready ? 'Chờ đã, bàn tiếp' : 'Sẵn sàng bỏ phiếu'}
          </button>
        )}
      </div>
    </div>
  );
}
