/**
 * The two votes. Vote 1 judges the guesser (everyone else raises a hand, all
 * at once when the last vote is in; then the guesser turns over their tile).
 * Vote 2 is everyone pointing at someone who still hides their tile, with
 * the guesser breaking a tie.
 */

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { GameState, PrivateState, PublicPlayer } from '@shared/types';
import { TIEBREAK_MS, VOTE_MS } from '@shared/timing';
import { Avatar } from '../art/Avatar';
import { CardBack, FlipCard, RoleFace } from '../art/RoleCard';
import { DeadlineBar } from './Bits';
import { sfx } from '../../lib/sound';
import { avatarOf, ROLES } from '../../lib/theme';

type Send = (event: string, payload?: object) => void;

interface Props {
  state: GameState;
  priv: PrivateState | null;
  youId: string;
  send: Send;
}

function useReveal(revealed: boolean) {
  useEffect(() => {
    if (!revealed) return;
    sfx.drum();
    const t = setTimeout(() => sfx.reveal(), 1300);
    return () => clearTimeout(t);
  }, [revealed]);
}

function byId(state: GameState) {
  return new Map(state.players.map((p) => [p.id, p]));
}

/** Who still has to vote, as a row of faces that light up once they have. */
function VoteStatus({ voters }: { voters: PublicPlayer[] }) {
  const done = voters.filter((p) => p.voted).length;
  return (
    <div className="mt-4 flex flex-col items-center gap-1.5">
      <div className="flex flex-wrap justify-center gap-1">
        {voters.map((p) => (
          <motion.span key={p.id} animate={{ opacity: p.voted ? 1 : 0.3, y: p.voted ? -3 : 0 }} title={p.name}>
            <Avatar id={p.avatar} size={28} />
          </motion.span>
        ))}
      </div>
      <span className="text-[11px] text-ink-soft">
        {done}/{voters.length} đã bỏ phiếu — lộ hết cùng lúc khi đủ phiếu
      </span>
    </div>
  );
}

/** A lamp over the player on trial. */
function Spotlight({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-col items-center pt-2">
      <div
        className="pointer-events-none absolute -top-6 h-[190px] w-[240px]"
        style={{
          background: 'linear-gradient(180deg, rgba(226,169,59,0.42), rgba(226,169,59,0.05))',
          clipPath: 'polygon(42% 0, 58% 0, 100% 100%, 0 100%)',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/* ----------------------------------------------------------------- vote 1 */

export function Vote1({ state, priv, youId, send }: Props) {
  const players = byId(state);
  const guesser = players.get(state.guesserId ?? '');
  const res = state.vote1;
  const me = players.get(youId);
  const canVote = !!me?.inRound && youId !== state.guesserId && !res;
  const mine = priv?.vote1;
  const voters = state.players.filter((p) => p.inRound && p.id !== state.guesserId);
  useReveal(!!res);
  if (!guesser) return null;

  return (
    <div className="paper scrollbar-thin flex min-h-0 flex-1 flex-col items-center overflow-y-auto rounded-3xl px-4 py-5">
      <span className="label">Biểu quyết lần 1 · xét người đoán ra từ khóa</span>
      <h2 className="display mt-1 text-center text-2xl font-bold uppercase tracking-wide text-ink sm:text-3xl">
        {guesser.id === youId ? 'Cả bàn đang xét bạn!' : `${guesser.name} có phải Nội gián?`}
      </h2>
      {!res && (
        <div className="mt-2 w-full max-w-sm">
          <DeadlineBar deadline={state.deadline} total={VOTE_MS} color="#d83d31" />
        </div>
      )}

      <div className="mt-6 flex items-end gap-5">
        <Spotlight>
          <Avatar id={guesser.avatar} size={104} mood={res ? 'shock' : 'calm'} />
        </Spotlight>
        {res && guesser.role && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 }}>
              <FlipCard
                flipped
                delay={1.3}
                width={92}
                back={<CardBack width={92} />}
                front={<RoleFace role={guesser.role} width={92} />}
              />
            </motion.div>
          )}
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        đã đoán ra “<b className="uppercase text-ink">{state.word}</b>”
      </p>

      {!res ? (
        canVote ? (
          <div className="mt-5 grid w-full max-w-sm grid-cols-2 gap-3">
            {(
              [
                [true, 'Có', 'là Nội gián', 'btn-red'],
                [false, 'Không', 'là Thường dân', 'btn-teal'],
              ] as const
            ).map(([yes, big, small, cls]) => (
              <motion.button
                key={big}
                type="button"
                whileTap={{ scale: 0.95 }}
                animate={{ scale: mine === yes ? 1.04 : 1, opacity: mine === null || mine === undefined || mine === yes ? 1 : 0.5 }}
                onClick={() => {
                  sfx.select();
                  send('vote1:cast', { yes });
                }}
                className={`btn ${cls} flex flex-col items-center !py-3`}
              >
                <span className="text-2xl leading-none">{big}</span>
                <span className="mt-1 text-[11px] font-medium normal-case tracking-normal opacity-85">{small}</span>
              </motion.button>
            ))}
          </div>
        ) : (
          <p className="mt-5 max-w-xs text-center text-sm text-ink-soft">
            {guesser.id === youId ? 'Bạn không bỏ phiếu lần này. Giữ bình tĩnh…' : 'Bạn đang xem ván này.'}
          </p>
        )
      ) : (
        <Hands res={res} players={players} />
      )}

      {!res && <VoteStatus voters={voters} />}
      {!res && mine !== null && mine !== undefined && (
        <p className="mt-2 text-[11px] text-ink-soft">Bạn chọn “{mine ? 'Có' : 'Không'}” — còn đổi được tới khi đủ phiếu.</p>
      )}
    </div>
  );
}

function Hands({ res, players }: { res: NonNullable<GameState['vote1']>; players: Map<string, PublicPlayer> }) {
  const col = (ids: string[], label: string, color: string, offset: number) => (
    <div className="flex flex-col items-center rounded-2xl bg-white/55 px-3 py-2">
      <span className="display text-lg font-bold uppercase" style={{ color }}>
        {label} · {ids.length}
      </span>
      <div className="mt-1 flex min-h-[40px] flex-wrap justify-center gap-1">
        {ids.map((id, i) => {
          const p = players.get(id);
          return (
            <motion.span
              key={id}
              initial={{ y: 26, opacity: 0, scale: 0.6 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: offset + i * 0.12, type: 'spring', stiffness: 360, damping: 18 }}
              title={p?.name}
              className="relative"
            >
              <Avatar id={p?.avatar ?? 0} size={34} />
              <span className="absolute -top-2 -right-1 text-sm">{label === 'Có' ? '✋' : '🙅'}</span>
            </motion.span>
          );
        })}
      </div>
    </div>
  );
  return (
    <div className="mt-5 flex w-full max-w-md flex-col items-center">
      <div className="grid w-full grid-cols-2 gap-3">
        {col(res.yes, 'Có', '#d83d31', 0)}
        {col(res.no, 'Không', '#2f7f7a', 0.1)}
      </div>
      <motion.span
        className="display mt-4 rounded-lg border-4 px-4 py-1 text-3xl font-bold uppercase tracking-widest"
        style={{ color: res.convicted ? '#d83d31' : '#2f7f7a', borderColor: res.convicted ? '#d83d31' : '#2f7f7a' }}
        initial={{ scale: 2.5, rotate: -16, opacity: 0 }}
        animate={{ scale: 1, rotate: -5, opacity: 1 }}
        transition={{ delay: 0.8, type: 'spring', stiffness: 480, damping: 16 }}
      >
        {res.convicted ? 'Kết tội' : 'Vô tội'}
      </motion.span>
    </div>
  );
}

/* ----------------------------------------------------------------- vote 2 */

function CandidateCard({
  p,
  youId,
  chosen,
  disabled,
  onPick,
  count,
  voters,
  top,
}: {
  p: PublicPlayer;
  youId: string;
  chosen: boolean;
  disabled: boolean;
  onPick?: () => void;
  count?: number;
  voters?: PublicPlayer[];
  top?: boolean;
}) {
  const color = avatarOf(p.avatar).coat;
  return (
    <motion.button
      type="button"
      layout
      disabled={disabled || !onPick}
      onClick={onPick}
      whileHover={disabled || !onPick ? undefined : { y: -4 }}
      whileTap={disabled || !onPick ? undefined : { scale: 0.96 }}
      animate={{ scale: top ? 1.05 : 1 }}
      className={`relative flex flex-col items-center rounded-2xl px-2 pt-3 pb-2 transition-colors ${
        chosen ? 'bg-white ring-4 ring-vermilion' : top ? 'bg-white ring-4 ring-ink' : 'bg-white/55'
      } ${disabled && p.id === youId ? 'opacity-40' : ''} disabled:cursor-default`}
    >
      {chosen && (
        <motion.span className="absolute -top-4 text-2xl" initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          👇
        </motion.span>
      )}
      <Avatar id={p.avatar} size={60} mood={top ? 'shock' : 'calm'} />
      <span className="mt-1 max-w-[90px] truncate text-sm font-semibold text-ink">{p.id === youId ? 'Bạn' : p.name}</span>
      <span className="mt-0.5 h-1 w-6 rounded-full" style={{ background: color }} />
      {count !== undefined && (
        <div className="mt-1.5 flex flex-col items-center">
          <motion.span
            className="display text-2xl font-bold text-ink"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 + (voters?.length ?? 0) * 0.12, type: 'spring', stiffness: 400, damping: 14 }}
          >
            {count}
          </motion.span>
          <div className="flex min-h-[22px] flex-wrap justify-center gap-0.5">
            {voters?.map((v, i) => (
              <motion.span
                key={v.id}
                initial={{ y: -30, opacity: 0, scale: 0.5 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.12, type: 'spring', stiffness: 380, damping: 18 }}
                title={v.name}
              >
                <Avatar id={v.avatar} size={20} />
              </motion.span>
            ))}
          </div>
        </div>
      )}
    </motion.button>
  );
}

export function Vote2({ state, priv, youId, send }: Props) {
  const players = byId(state);
  const res = state.vote2;
  const me = players.get(youId);
  const candidates = (state.candidates ?? []).map((id) => players.get(id)).filter(Boolean) as PublicPlayer[];
  const canVote = !!me?.inRound && !res;
  const mine = priv?.vote2;
  useReveal(!!res);
  const voters = state.players.filter((p) => p.inRound);
  const exposed = [state.masterId, state.guesserId].map((id) => players.get(id ?? '')).filter(Boolean) as PublicPlayer[];

  return (
    <div className="paper scrollbar-thin flex min-h-0 flex-1 flex-col items-center overflow-y-auto rounded-3xl px-4 py-5">
      <span className="label">Biểu quyết lần 2 · cùng chỉ tay</span>
      <h2 className="display mt-1 text-center text-2xl font-bold uppercase tracking-wide text-ink sm:text-3xl">
        {res ? (res.top.length > 1 ? 'Hoà phiếu!' : 'Cả bàn đã chỉ vào…') : 'Ai là Nội gián?'}
      </h2>
      {!res && (
        <div className="mt-2 w-full max-w-sm">
          <DeadlineBar deadline={state.deadline} total={VOTE_MS} color="#d83d31" />
        </div>
      )}
      <p className="mt-2 max-w-md text-center text-xs text-ink-soft">
        {exposed.map((p) => p.name).join(' và ')} đã lộ vai. Chỉ vào một người còn giấu vai — nhiều phiếu nhất mà đúng Nội gián thì
        Quản trò &amp; Thường dân thắng.
      </p>

      <div className="mt-5 grid w-full max-w-xl grid-cols-2 gap-3 sm:grid-cols-3">
        {candidates.map((p) => (
          <CandidateCard
            key={p.id}
            p={p}
            youId={youId}
            chosen={!res && mine === p.id}
            disabled={!canVote || p.id === youId}
            onPick={
              canVote && p.id !== youId
                ? () => {
                    sfx.select();
                    send('vote2:cast', { target: p.id });
                  }
                : undefined
            }
            count={res ? res.tally[p.id] : undefined}
            voters={res ? Object.keys(res.votes).filter((v) => res.votes[v] === p.id).map((v) => players.get(v)!).filter(Boolean) : undefined}
            top={!!res && res.top.includes(p.id)}
          />
        ))}
      </div>

      {!res && <VoteStatus voters={voters} />}
      {res && res.top.length > 1 && (
        <p className="mt-4 text-sm text-ink-soft">
          <b className="text-ink">{players.get(state.guesserId ?? '')?.name}</b> — người đoán ra từ khóa — sẽ quyết định.
        </p>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- tiebreak */

export function Tiebreak({ state, youId, send }: Props) {
  const players = byId(state);
  const guesser = players.get(state.guesserId ?? '');
  const tied = (state.tiedIds ?? []).map((id) => players.get(id)).filter(Boolean) as PublicPlayer[];
  const deciding = youId === state.guesserId;

  return (
    <div className="paper scrollbar-thin flex min-h-0 flex-1 flex-col items-center overflow-y-auto rounded-3xl px-4 py-5">
      <span className="label">Hoà phiếu</span>
      <h2 className="display mt-1 text-center text-2xl font-bold uppercase tracking-wide text-ink sm:text-3xl">
        {deciding ? 'Bạn quyết định!' : `${guesser?.name ?? 'Người đoán'} quyết định`}
      </h2>
      <div className="mt-2 w-full max-w-sm">
        <DeadlineBar deadline={state.deadline} total={TIEBREAK_MS} color="#e2a93b" />
      </div>
      <p className="mt-2 text-center text-xs text-ink-soft">
        {deciding ? 'Chọn người bạn tin là Nội gián.' : 'Người đoán ra từ khóa phá thế hoà phiếu.'}
      </p>
      <div className="mt-5 grid w-full max-w-xl grid-cols-2 gap-3 sm:grid-cols-3">
        {tied.map((p) => (
          <CandidateCard
            key={p.id}
            p={p}
            youId={youId}
            chosen={false}
            disabled={!deciding}
            onPick={
              deciding
                ? () => {
                    sfx.select();
                    send('tiebreak:pick', { target: p.id });
                  }
                : undefined
            }
          />
        ))}
      </div>
      {!deciding && guesser && (
        <div className="mt-5 flex items-center gap-2 text-sm text-ink-soft">
          <Avatar id={guesser.avatar} size={30} /> đang suy nghĩ…
        </div>
      )}
      <p className="mt-4 text-[11px] text-ink-soft">
        {ROLES.common.label} đoán đúng từ khóa nên được tin — hãy chọn cho kỹ.
      </p>
    </div>
  );
}
