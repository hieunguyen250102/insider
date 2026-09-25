/**
 * The Q&A under the hourglass. Players ask yes/no questions or name a guess;
 * the Master stamps answers (keys 1–4 answer the oldest open question). The
 * same feed, read-only, is what the table argues over in the discussion.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Answer, GameState, PrivateState, Question } from '@shared/types';
import { mentionsKeyword } from '@shared/engine';
import { GUESS_COOLDOWN_MS } from '@shared/timing';
import { Avatar } from '../art/Avatar';
import { Stamp } from '../art/Stamp';
import { HourglassHeader, PendingDots } from './Bits';
import { SendIcon } from '../Chat';
import { sfx } from '../../lib/sound';
import { ANSWERS } from '../../lib/theme';

type Send = (event: string, payload?: object) => void;

const QUICK_ASKS = ['Là đồ vật à?', 'Ăn được không?', 'Là con vật à?', 'Là một địa điểm?', 'Có trong nhà không?', 'To hơn người không?'];
const ANSWER_KEYS: Answer[] = ['yes', 'no', 'unknown', 'correct'];

function time(at: number) {
  const d = new Date(at);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

/** The feed, with fresh answers stamped down (and heard) as they arrive. */
export function QAFeed({
  state,
  priv,
  youId,
  send,
  empty,
}: {
  state: GameState;
  priv: PrivateState | null;
  youId: string;
  send?: Send;
  empty: string;
}) {
  const questions = state.questions;
  const master = priv?.role === 'master' && state.phase === 'qa' && !!send;
  const [editing, setEditing] = useState<number | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const names = useMemo(() => new Map(state.players.map((p) => [p.id, p])), [state.players]);

  // Questions already there when the feed opens don't fly in.
  const initialIds = useRef<Set<number> | null>(null);
  if (!initialIds.current) initialIds.current = new Set(questions.map((q) => q.id));

  // Only answers that change while we watch are stamped with a thud.
  const seen = useRef<Map<number, Answer | null> | null>(null);
  if (!seen.current) seen.current = new Map(questions.map((q) => [q.id, q.answer]));
  const isFresh = (q: Question) => seen.current!.get(q.id) !== q.answer;
  useEffect(() => {
    const map = seen.current!;
    const changed = questions.filter((q) => map.get(q.id) !== q.answer);
    const stamped = changed.find((q) => q.answer);
    if (stamped?.answer) {
      if (stamped.kind === 'guess' && stamped.answer === 'no') sfx.wrong();
      else sfx.stamp(stamped.answer);
    } else if (changed.length) sfx.tap();
    for (const q of questions) map.set(q.id, q.answer);
  }, [questions]);

  // Follow the newest question unless the reader has scrolled up.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 160) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [questions.length]);

  // Master shortcuts: 1 Có · 2 Không · 3 Không biết · 4 Đúng rồi! Quick presses
  // must not land twice on the same question before the server's echo.
  const sent = useRef(new Set<number>());
  useEffect(() => {
    if (!master || !send) return;
    for (const id of sent.current) if (questions.find((q) => q.id === id)?.answer !== null) sent.current.delete(id);
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const idx = ['1', '2', '3', '4'].indexOf(e.key);
      if (idx < 0) return;
      const open = questions.find((q) => q.answer === null && !sent.current.has(q.id));
      if (!open) return;
      sent.current.add(open.id);
      send('qa:answer', { id: open.id, answer: ANSWER_KEYS[idx] });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [master, send, questions]);

  return (
    <ol ref={listRef} className="scrollbar-thin min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
      {questions.length === 0 && <li className="flex h-full items-center justify-center px-6 py-8 text-center text-sm text-ink-soft/70">{empty}</li>}
      {questions.map((q) => {
          const who = names.get(q.playerId);
          const mine = q.playerId === youId;
          const open = q.answer === null;
          const showButtons = master && (open || editing === q.id);
          const hint = master && q.kind === 'ask' && open && priv?.word && mentionsKeyword(priv.word, q.text);
          return (
            <motion.li
              key={q.id}
              layout="position"
              initial={initialIds.current!.has(q.id) ? false : { opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className={`flex items-start gap-2.5 rounded-2xl px-3 py-2 ${
                q.answer === 'correct'
                  ? 'bg-olive/15 ring-2 ring-olive/50'
                  : open
                    ? master
                      ? 'bg-white ring-2 ring-mustard'
                      : 'bg-white/80'
                    : 'bg-white/45'
              }`}
            >
              <Avatar id={who?.avatar ?? 0} size={30} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-ink-soft">
                  <b className={mine ? 'text-vermilion' : 'text-ink'}>{mine ? 'Bạn' : (who?.name ?? '…')}</b>{' '}
                  {q.kind === 'guess' ? 'đoán' : 'hỏi'} · <span className="tabular-nums">{time(q.at)}</span>
                </div>
                <div className={`break-words leading-snug text-ink ${q.kind === 'guess' ? 'display text-lg font-semibold' : 'text-sm'}`}>
                  {q.kind === 'guess' ? <>🎯 “{q.text}”</> : q.text}
                </div>
                {hint && (
                  <p className="mt-1 text-[11px] font-semibold text-olive">Câu này nhắc đúng từ khóa — nếu là đoán thì bấm “Đúng rồi!”</p>
                )}
                {showButtons && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {ANSWER_KEYS.map((a, i) => (
                      <motion.button
                        key={a}
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        onClick={() => {
                          setEditing(null);
                          send!('qa:answer', { id: q.id, answer: a });
                        }}
                        className="display rounded-lg px-2.5 py-1 text-sm font-semibold uppercase tracking-wide text-cream"
                        style={{ background: ANSWERS[a].color, boxShadow: '0 2px 0 rgba(0,0,0,0.25)' }}
                      >
                        {ANSWERS[a].label}
                        {open && <span className="ml-1 text-[10px] opacity-60">{i + 1}</span>}
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
              <div className="shrink-0 self-center">
                {q.answer ? (
                  <button
                    type="button"
                    disabled={!master}
                    onClick={() => setEditing(editing === q.id ? null : q.id)}
                    title={master ? 'Sửa câu trả lời' : undefined}
                    className="disabled:cursor-default"
                  >
                    <Stamp key={q.answer} answer={q.answer} guess={q.kind === 'guess'} fresh={isFresh(q)} />
                  </button>
                ) : (
                  <PendingDots className="text-ink-soft/50" />
                )}
              </div>
            </motion.li>
          );
        })}
    </ol>
  );
}

function Composer({ send, blocked }: { send: Send; blocked: boolean }) {
  const [mode, setMode] = useState<'ask' | 'guess'>('ask');
  const [draft, setDraft] = useState('');
  const [coolUntil, setCoolUntil] = useState(0);
  const [, force] = useState(0);
  const cooling = mode === 'guess' && coolUntil > Date.now();

  useEffect(() => {
    if (coolUntil <= Date.now()) return;
    const t = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [coolUntil]);

  const submit = (text = draft) => {
    const t = text.trim();
    if (!t || blocked || cooling) return;
    sfx.send();
    if (mode === 'guess') {
      send('qa:guess', { text: t });
      setCoolUntil(Date.now() + GUESS_COOLDOWN_MS);
    } else send('qa:ask', { text: t });
    setDraft('');
  };

  return (
    <div className="border-t border-ink/10 px-3 pt-2.5 pb-3">
      <div className="mb-2 flex items-center gap-2">
        <div className="inline-flex rounded-xl bg-ink/[0.07] p-0.5">
          {(
            [
              ['ask', 'Hỏi Có/Không'],
              ['guess', 'Đoán từ khóa'],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                sfx.tap();
                setMode(m);
              }}
              className={`relative rounded-[10px] px-3 py-1 text-xs font-semibold transition-colors ${
                mode === m ? 'text-cream' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {mode === m && (
                <motion.span
                  layoutId="composer-mode"
                  className={`absolute inset-0 rounded-[10px] ${m === 'ask' ? 'bg-ink' : 'bg-vermilion'}`}
                  transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                />
              )}
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
        <span className="hidden text-[11px] text-ink-soft sm:inline">
          {mode === 'ask' ? 'Enter để gửi câu hỏi' : 'Gõ có dấu hay không dấu đều được'}
        </span>
      </div>

      {mode === 'ask' && (
        <div className="scrollbar-none -mx-3 mb-2 flex gap-1.5 overflow-x-auto px-3">
          {QUICK_ASKS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={blocked}
              onClick={() => submit(q)}
              className="shrink-0 rounded-full border border-ink/15 bg-white/60 px-2.5 py-0.5 text-xs text-ink-soft transition-colors hover:bg-white disabled:opacity-40"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          maxLength={mode === 'ask' ? 140 : 48}
          placeholder={mode === 'ask' ? 'Hỏi Quản trò… (vd: Nó có bay được không?)' : 'Từ khóa là…'}
          aria-label={mode === 'ask' ? 'Câu hỏi' : 'Từ bạn đoán'}
          className={`field min-w-0 flex-1 !py-2.5 ${mode === 'guess' ? 'display text-lg font-semibold !border-vermilion/50' : 'text-sm'}`}
        />
        <button
          type="submit"
          disabled={!draft.trim() || blocked || cooling}
          className={`btn shrink-0 !px-4 ${mode === 'ask' ? 'btn-ink' : 'btn-red'}`}
        >
          {cooling ? `${Math.ceil((coolUntil - Date.now()) / 1000)}s` : mode === 'ask' ? <SendIcon /> : 'Đoán!'}
        </button>
      </form>
    </div>
  );
}

function MasterBar({ word }: { word: string }) {
  const [hidden, setHidden] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-ink/10 bg-teal/[0.08] px-4 py-2.5">
      <span className="label !text-teal">Bạn là Quản trò · từ khóa</span>
      <button
        type="button"
        onClick={() => setHidden((h) => !h)}
        className="display rounded-lg bg-ink px-3 py-0.5 text-lg font-bold uppercase tracking-wide text-paper"
        title="Chạm để che / hiện"
      >
        {hidden ? '• • • • •' : word}
      </button>
      <span className="hidden text-[11px] text-ink-soft sm:inline">
        Phím <b>1</b> Có · <b>2</b> Không · <b>3</b> Không biết · <b>4</b> Đúng rồi — cho câu cũ nhất. Chạm con dấu để sửa.
      </span>
    </div>
  );
}

export function QAPanel({ state, priv, youId, send }: { state: GameState; priv: PrivateState | null; youId: string; send: Send }) {
  const role = priv?.role ?? null;
  const me = state.players.find((p) => p.id === youId);
  const waiting = state.questions.filter((q) => q.answer === null).length;
  const hint =
    role === 'master' ? (
      <>Trả lời từng câu. {waiting > 0 ? <b className="text-vermilion">{waiting} câu đang chờ bạn.</b> : 'Chưa có câu nào chờ.'}</>
    ) : role === 'insider' ? (
      <>Bạn biết từ khóa — hỏi khéo để dẫn cả bàn tới đó, đừng lộ!</>
    ) : me?.inRound ? (
      <>Hỏi câu Có/Không, hoặc đoán thẳng từ khóa. Hết cát là cả bàn thua!</>
    ) : (
      <>Bạn vào giữa chừng — xem trước, ván sau sẽ có vai.</>
    );

  return (
    <div className="paper flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl">
      <HourglassHeader state={state} title="Hỏi — đáp" hint={hint} />
      <QAFeed state={state} priv={priv} youId={youId} send={send} empty="Chưa ai hỏi gì. Mở màn đi — “Nó có ăn được không?”" />
      {role === 'master' && priv?.word ? (
        <MasterBar word={priv.word} />
      ) : me?.inRound && role ? (
        <Composer send={send} blocked={state.phase !== 'qa'} />
      ) : null}
    </div>
  );
}
