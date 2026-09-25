/**
 * A round in progress: the top bar, everybody's seat, the stage for the
 * current phase, and the chat beside it (a tab on phones). It also turns
 * phase changes into the big moments: the night, "found it!", the ticking
 * of the last seconds.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameState, Phase, PrivateState } from '@shared/types';
import { Logo } from './Logo';
import { ChatBox, type ChatItem } from './Chat';
import { Seats } from './game/Seats';
import { QAPanel } from './game/QAPanel';
import { Discussion } from './game/Discussion';
import { Tiebreak, Vote1, Vote2 } from './game/Votes';
import { Result } from './game/Result';
import { Night } from './game/Night';
import { MyRole } from './game/Bits';
import { FoundBanner } from './Overlays';
import { useMediaQuery, usePrevious } from '../lib/hooks';
import { serverTime } from '../lib/clock';
import { sfx } from '../lib/sound';

type Send = (event: string, payload?: object) => void;

interface Props {
  state: GameState;
  priv: PrivateState | null;
  youId: string;
  chat: ChatItem[];
  muted: boolean;
  onToggleMute: () => void;
  onSendChat: (text: string) => void;
  send: Send;
  onLeave: () => void;
  onShowRules: () => void;
}

const PHASE_LABEL: Record<Phase, string> = {
  lobby: 'Phòng chờ',
  reveal: 'Chia vai',
  qa: 'Hỏi — đáp',
  discussion: 'Thảo luận',
  vote1: 'Biểu quyết 1',
  vote2: 'Biểu quyết 2',
  tiebreak: 'Hoà phiếu',
  result: 'Kết quả',
};

/** Tick-tock through the last ten seconds of the hourglass. */
function useLastSeconds(deadline: number | undefined, active: boolean) {
  const last = useRef(-1);
  useEffect(() => {
    if (!active || !deadline) return;
    const t = setInterval(() => {
      const s = Math.ceil((deadline - serverTime()) / 1000);
      if (s <= 10 && s > 0 && s !== last.current) {
        last.current = s;
        if (s % 2) sfx.tick();
        else sfx.tock();
      }
    }, 200);
    return () => clearInterval(t);
  }, [deadline, active]);
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="btn btn-ghost flex h-9 w-9 items-center justify-center !p-0">
      {children}
    </button>
  );
}

function TopBar({ state, priv, muted, onToggleMute, onShowRules, onLeave }: Pick<Props, 'state' | 'priv' | 'muted' | 'onToggleMute' | 'onShowRules' | 'onLeave'>) {
  const peek = ['qa', 'discussion', 'vote1', 'vote2', 'tiebreak'].includes(state.phase);
  return (
    <header className="flex items-center gap-2 px-3 pt-2.5 pb-1.5 sm:gap-3 sm:px-4">
      <Logo compact />
      <span className="hidden rounded-full bg-paper/10 px-2.5 py-0.5 text-xs font-semibold text-paper/75 sm:inline">
        Bàn {state.roomCode} · Ván {state.round}
      </span>
      <motion.span
          key={state.phase}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="display whitespace-nowrap rounded-full bg-vermilion px-3 py-0.5 text-xs font-semibold uppercase tracking-widest text-cream"
        >
          {PHASE_LABEL[state.phase]}
        </motion.span>
      <div className="ml-auto flex items-center gap-1.5">
        {peek && <MyRole priv={priv} />}
        <IconButton label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'} onClick={onToggleMute}>
          {muted ? '🔇' : '🔊'}
        </IconButton>
        <IconButton label="Luật chơi" onClick={onShowRules}>
          <span className="display text-base font-bold">?</span>
        </IconButton>
        <IconButton label="Rời bàn" onClick={onLeave}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </IconButton>
      </div>
    </header>
  );
}

export function GameScreen(props: Props) {
  const { state, priv, youId, chat, onSendChat, send } = props;
  const wide = useMediaQuery('(min-width: 1024px)');
  const [tab, setTab] = useState<'game' | 'chat'>('game');
  const [readUpTo, setReadUpTo] = useState(() => chat.at(-1)?.id ?? 0);
  const [banner, setBanner] = useState<{ word: string; name: string; avatar: number } | null>(null);
  const prevPhase = usePrevious(state.phase);

  useLastSeconds(state.deadline, state.phase === 'qa');

  // The moment the keyword is found: gong, banner, then the flipped hourglass.
  useEffect(() => {
    if (prevPhase === 'qa' && state.phase === 'discussion' && state.word) {
      const g = state.players.find((p) => p.id === state.guesserId);
      sfx.gong();
      setBanner({ word: state.word, name: g?.id === youId ? 'Bạn' : (g?.name ?? 'Ai đó'), avatar: g?.avatar ?? 0 });
      const t = setTimeout(() => setBanner(null), 2600);
      return () => clearTimeout(t);
    }
    if (prevPhase && prevPhase !== state.phase && ['vote1', 'vote2', 'tiebreak'].includes(state.phase)) sfx.whoosh();
    if (prevPhase === 'qa' && state.phase === 'result') sfx.lose();
  }, [state.phase]);

  // Unread chat on phones, where the chat is a tab.
  const lastId = chat.at(-1)?.id ?? 0;
  useEffect(() => {
    if (wide || tab === 'chat') setReadUpTo(lastId);
  }, [wide, tab, lastId]);
  const unread = chat.filter((m) => m.id > readUpTo && !m.system && m.playerId !== youId).length;

  const stage = (() => {
    switch (state.phase) {
      case 'reveal':
      case 'qa':
        return <QAPanel state={state} priv={priv} youId={youId} send={send} />;
      case 'discussion':
        return <Discussion state={state} priv={priv} youId={youId} send={send} />;
      case 'vote1':
        return <Vote1 state={state} priv={priv} youId={youId} send={send} />;
      case 'vote2':
        return <Vote2 state={state} priv={priv} youId={youId} send={send} />;
      case 'tiebreak':
        return <Tiebreak state={state} priv={priv} youId={youId} send={send} />;
      case 'result':
        return <Result state={state} priv={priv} youId={youId} send={send} />;
      default:
        return null;
    }
  })();

  const stageKey = state.phase === 'reveal' ? 'qa' : state.phase;
  const chatPanel = (
    <div className="paper flex min-h-0 flex-1 flex-col rounded-3xl p-3.5">
      <h2 className="display mb-1 text-lg font-bold uppercase tracking-wide text-ink">Trò chuyện</h2>
      <ChatBox messages={chat} youId={youId} onSend={onSendChat} className="flex-1" />
    </div>
  );

  return (
    <div className="flex h-dvh flex-col">
      <TopBar {...props} />
      <Seats state={state} youId={youId} chat={chat} />

      {wide ? (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_340px] gap-4 px-4 pt-1 pb-4">
          <motion.main
            key={stageKey}
            className="flex min-h-0 flex-col"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {stage}
          </motion.main>
          <aside className="flex min-h-0 flex-col">{chatPanel}</aside>
        </div>
      ) : (
        <>
          <div className="flex gap-1.5 px-3 pt-1 pb-2">
            {(
              [
                ['game', PHASE_LABEL[state.phase]],
                ['chat', 'Trò chuyện'],
              ] as const
            ).map(([t, label]) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`relative flex-1 rounded-xl py-1.5 text-sm font-semibold transition-colors ${
                  tab === t ? 'bg-paper text-ink' : 'bg-paper/10 text-paper/75'
                }`}
              >
                {label}
                {t === 'chat' && unread > 0 && (
                  <motion.span
                    key={unread}
                    initial={{ scale: 0.4 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 right-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-vermilion px-1 text-[11px] font-bold text-cream"
                  >
                    {unread}
                  </motion.span>
                )}
              </button>
            ))}
          </div>
          <div className="flex min-h-0 flex-1 flex-col px-3 pb-3">
            {tab === 'chat' ? (
              chatPanel
            ) : (
              <motion.main
                key={stageKey}
                className="flex min-h-0 flex-1 flex-col"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {stage}
              </motion.main>
            )}
          </div>
        </>
      )}

      {/* No exit animations on overlays: they stall in hidden tabs and would cover the table. */}
      {state.phase === 'reveal' && <Night key={`night-${state.round}`} state={state} priv={priv} />}
      {banner && <FoundBanner {...banner} />}
    </div>
  );
}
