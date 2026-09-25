/** Waiting room: the table code to share, who sits where, the settings, and the start button. */

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { GameState, Settings } from '@shared/types';
import { MAX_PLAYERS, MIN_PLAYERS } from '@shared/engine';
import { QA_OPTIONS } from '@shared/timing';
import { Avatar } from './art/Avatar';
import { AvatarPicker } from './Home';
import { Logo } from './Logo';
import { sfx } from '../lib/sound';
import { avatarOf } from '../lib/theme';
import { ChatBox, type ChatItem } from './Chat';

interface Props {
  state: GameState;
  youId: string;
  onStart: () => void;
  onAddBot: () => void;
  onKick: (id: string) => void;
  onAvatar: (avatar: number) => void;
  onSettings: (s: Partial<Settings>) => void;
  onLeave: () => void;
  onShowRules: () => void;
  chat: ChatItem[];
  onSendChat: (text: string) => void;
}

/** Everybody seated round the table, under the lamp. */
export function RoundTable({ players, size = 250 }: { players: GameState['players']; size?: number }) {
  const r = size / 2 - 30;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <div className="absolute inset-[34px] rounded-full bg-night-2 shadow-[inset_0_0_0_3px_rgba(247,240,223,0.08)]" />
      <div
        className="absolute inset-[34px] rounded-full"
        style={{ background: 'radial-gradient(circle at 50% 45%, rgba(226,169,59,0.28), transparent 62%)' }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="display text-[11px] font-semibold uppercase tracking-[0.3em] text-paper/35">
          {players.length}/{MAX_PLAYERS}
        </span>
      </div>
      {players.map((p, i) => {
          const angle = (i / Math.max(players.length, 4)) * Math.PI * 2 - Math.PI / 2;
          return (
            <motion.div
              key={p.id}
              className="absolute"
              style={{ left: size / 2 - 22, top: size / 2 - 22 }}
              initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
              animate={{ x: Math.cos(angle) * r, y: Math.sin(angle) * r, scale: 1, opacity: p.connected ? 1 : 0.4 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            >
              <div className="bob" style={{ animationDelay: `${-i * 0.45}s` }}>
                <Avatar id={p.avatar} size={44} />
              </div>
            </motion.div>
          );
        })}
    </div>
  );
}

export function Lobby({ state, youId, onStart, onAddBot, onKick, onAvatar, onSettings, onLeave, onShowRules, chat, onSendChat }: Props) {
  const [copied, setCopied] = useState(false);
  const isHost = state.hostId === youId;
  const me = state.players.find((p) => p.id === youId);
  const canStart = state.players.length >= MIN_PLAYERS;
  const { qaSeconds, masterMode } = state.settings;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(state.roomCode);
      setCopied(true);
      sfx.select();
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard can be blocked — the code is on screen anyway */
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-5 px-4 py-8 lg:max-w-5xl">
      <Logo compact />

      <div className="grid w-full gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex w-full flex-col items-center gap-4">
          <motion.button
            type="button"
            onClick={copy}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="paper w-full rounded-3xl px-5 py-4 text-center transition-transform hover:-translate-y-0.5"
          >
            <div className="label">Mã bàn — chạm để chép, gửi cho bạn bè</div>
            <div className="display mt-1 text-5xl font-bold tracking-[0.3em] text-vermilion">{state.roomCode}</div>
            <div className="mt-1 h-4 text-xs font-semibold text-teal">{copied ? 'Đã chép!' : ''}</div>
          </motion.button>

          <div className="paper w-full rounded-3xl p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="display text-xl font-bold uppercase tracking-wide text-ink">Quanh bàn</h2>
              <span className="text-[11px] text-ink-soft">
                {MIN_PLAYERS}–{MAX_PLAYERS} người · 1 Quản trò · 1 Nội gián
              </span>
            </div>

            <div className="mt-2 rounded-2xl bg-ink px-2 py-3">
              <RoundTable players={state.players} />
            </div>

            <ul className="mt-3 space-y-1.5">
              {state.players.map((p) => (
                  <motion.li
                    key={p.id}
                    layout
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2.5 rounded-xl bg-white/60 px-3 py-1.5"
                  >
                    <span className="h-3 w-3 shrink-0 rounded-full ring-2 ring-ink/15" style={{ background: avatarOf(p.avatar).coat }} />
                    <span className="display flex-1 truncate text-base font-semibold text-ink">
                      {p.name}
                      {p.id === youId && <span className="ml-1.5 font-sans text-xs font-medium text-ink-soft">(bạn)</span>}
                    </span>
                    {state.hostId === p.id && (
                      <span className="rounded-md bg-mustard/30 px-1.5 py-0.5 text-[10px] font-bold text-mustard-deep">CHỦ BÀN</span>
                    )}
                    {p.isBot && <span className="rounded-md bg-teal/15 px-1.5 py-0.5 text-[10px] font-bold text-teal">BOT</span>}
                    {p.wins > 0 && <span className="text-[11px] font-semibold text-ink-soft">🏆 {p.wins}</span>}
                    {isHost && p.id !== youId && (
                      <button
                        type="button"
                        onClick={() => onKick(p.id)}
                        className="rounded-lg px-2 py-0.5 text-xs text-vermilion hover:bg-vermilion/10"
                        aria-label={`Mời ${p.name} rời bàn`}
                      >
                        ✕
                      </button>
                    )}
                  </motion.li>
                ))}
            </ul>

            {isHost && state.players.length < MAX_PLAYERS && (
              <button type="button" onClick={onAddBot} className="btn btn-paper mt-3 w-full text-sm">
                + Thêm bot
              </button>
            )}
            {state.players.some((p) => p.isBot) && (
              <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
                Bot chỉ làm Thường dân hoặc Nội gián — Quản trò luôn là người thật để trả lời câu hỏi.
              </p>
            )}

            {me && (
              <>
                <div className="rule my-3" />
                <span className="label">Nhân vật của bạn</span>
                <div className="mt-1">
                  <AvatarPicker
                    value={me.avatar}
                    onChange={onAvatar}
                    taken={state.players.filter((p) => p.id !== youId).map((p) => p.avatar)}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex w-full flex-col gap-4">
          <div className="paper rounded-3xl p-4">
            <h2 className="display text-xl font-bold uppercase tracking-wide text-ink">Thiết lập</h2>
            <span className="label mt-3">Đồng hồ cát</span>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {QA_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={!isHost}
                  onClick={() => onSettings({ qaSeconds: s })}
                  className={`display rounded-xl py-2 text-lg font-bold transition-colors ${
                    qaSeconds === s ? 'bg-ink text-paper' : 'bg-white/60 text-ink-soft hover:bg-white'
                  } disabled:cursor-default`}
                >
                  {s / 60}′
                </button>
              ))}
            </div>
            <span className="label mt-3">Quản trò</span>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {(
                [
                  ['rotate', 'Lần lượt từng người'],
                  ['random', 'Ngẫu nhiên'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  disabled={!isHost}
                  onClick={() => onSettings({ masterMode: mode })}
                  className={`rounded-xl px-2 py-2 text-sm font-semibold transition-colors ${
                    masterMode === mode ? 'bg-ink text-paper' : 'bg-white/60 text-ink-soft hover:bg-white'
                  } disabled:cursor-default`}
                >
                  {label}
                </button>
              ))}
            </div>
            {!isHost && <p className="mt-2 text-[11px] text-ink-soft">Chỉ chủ bàn đổi được thiết lập.</p>}
          </div>

          <div className="paper flex h-80 w-full flex-col rounded-3xl p-4 lg:h-auto lg:flex-1">
            <h2 className="display text-xl font-bold uppercase tracking-wide text-ink">Trò chuyện</h2>
            <ChatBox messages={chat} youId={youId} onSend={onSendChat} className="mt-2 flex-1" />
          </div>

          {isHost ? (
            <button
              type="button"
              disabled={!canStart}
              onClick={() => {
                sfx.eyesClose();
                onStart();
              }}
              className="btn btn-red w-full text-lg"
            >
              {canStart ? 'Chia vai — bắt đầu!' : `Cần ít nhất ${MIN_PLAYERS} người (thêm bot nếu thiếu)`}
            </button>
          ) : (
            <div className="display animate-pulse text-center text-sm uppercase tracking-widest text-paper/70">
              Đang chờ chủ bàn bắt đầu…
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4 text-xs">
        <button type="button" onClick={onShowRules} className="text-paper/70 underline-offset-4 hover:text-paper hover:underline">
          Luật chơi
        </button>
        <button type="button" onClick={onLeave} className="text-paper/55 underline-offset-4 hover:underline">
          Rời bàn
        </button>
      </div>
    </div>
  );
}
