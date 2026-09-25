/** Table talk: a message list with a composer, in the lobby and during the round. */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { ChatMessage } from '@shared/types';
import { Avatar } from './art/Avatar';

/** A message plus when *this* browser received it (0 for history), for speech bubbles. */
export type ChatItem = ChatMessage & { recvAt: number };

const QUICK = ['🤔', 'Nghi quá!', 'Không phải mình 😅', 'Hay!'];

function time(at: number) {
  const d = new Date(at);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

interface Props {
  messages: ChatItem[];
  youId: string;
  onSend: (text: string) => void;
  autoFocus?: boolean;
  className?: string;
}

export function ChatBox({ messages, youId, onSend, autoFocus, className = '' }: Props) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  // Messages already there when the box opens don't slide in.
  const initialIds = useRef<Set<number> | null>(null);
  if (!initialIds.current) initialIds.current = new Set(messages.map((m) => m.id));

  // Stick to the newest message, the way every chat does.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: messages.length > 1 ? 'smooth' : 'auto' });
  }, [messages.length]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setDraft('');
  };

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div ref={listRef} className="scrollbar-thin min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center py-6 text-center text-xs text-ink-soft/70">
            Chưa có tin nhắn nào — chào cả bàn một câu đi!
          </div>
        )}
        {messages.map((m, i) => {
            if (m.system) {
              return (
                <motion.div
                  key={m.id}
                  initial={initialIds.current!.has(m.id) ? false : { opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex justify-center py-0.5"
                >
                  <span className="rounded-full bg-ink/[0.07] px-3 py-1 text-center text-[11px] leading-snug text-ink-soft">
                    {m.text}
                  </span>
                </motion.div>
              );
            }
            const mine = m.playerId === youId;
            const prev = messages[i - 1];
            const grouped = !!prev && !prev.system && prev.playerId === m.playerId && m.at - prev.at < 60_000;
            return (
              <motion.div
                key={m.id}
                initial={initialIds.current!.has(m.id) ? false : { opacity: 0, y: 8, x: mine ? 8 : -8 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''} ${grouped ? '!mt-0.5' : ''}`}
              >
                {!mine && (
                  <span className={`shrink-0 ${grouped ? 'invisible' : ''}`}>
                    <Avatar id={m.avatar} size={26} />
                  </span>
                )}
                <div className={`flex min-w-0 max-w-[80%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  {!grouped && (
                    <div className="mb-0.5 flex items-baseline gap-1.5 px-1 text-[10px] text-ink-soft/80">
                      {!mine && <span className="font-bold text-ink">{m.name}</span>}
                      <span className="tabular-nums">{time(m.at)}</span>
                    </div>
                  )}
                  <div
                    className={`break-words rounded-2xl px-3 py-1.5 text-sm leading-snug ${
                      mine ? 'rounded-br-md bg-ink text-paper' : 'rounded-bl-md bg-white/75 text-ink'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              </motion.div>
            );
          })}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => send(q)}
            className="rounded-full border border-ink/15 bg-white/50 px-2.5 py-0.5 text-xs text-ink-soft transition-colors hover:bg-white"
          >
            {q}
          </button>
        ))}
      </div>

      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Explicit, so Enter sends everywhere — but not while a Telex/VNI word is still composing.
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send(draft);
            }
          }}
          maxLength={240}
          autoFocus={autoFocus}
          placeholder="Nhắn cả bàn…"
          aria-label="Tin nhắn"
          className="field min-w-0 flex-1 !py-2 text-sm"
        />
        <button type="submit" disabled={!draft.trim()} className="btn btn-ink !px-3.5 !py-2 text-sm" aria-label="Gửi">
          <SendIcon />
        </button>
      </form>
    </div>
  );
}

export function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
