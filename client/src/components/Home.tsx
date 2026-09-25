/**
 * Landing screen. Signing in comes first: an email, then the 6-digit code
 * mailed to it. Then pick a name and a character, and create or join a
 * table. Only emails in the server's HOST_EMAILS may create one.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useEmailLogin } from 'oink-kit/react';
import { AVATARS } from '../lib/theme';
import { authClient, type Session } from '../lib/net';
import { Avatar } from './art/Avatar';
import { Logo } from './Logo';
import { sfx } from '../lib/sound';

interface Props {
  session: Session | null;
  onLogin: (session: Session) => void;
  onLogout: () => void;
  name: string;
  avatar: number;
  onIdentity: (name: string, avatar: number) => void;
  onCreate: () => void;
  onJoin: (code: string) => void;
  connected: boolean;
  onShowRules: () => void;
}

export function Home(props: Props) {
  const { session, connected, onShowRules } = props;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        <Logo />

        <p className="mx-auto mt-4 max-w-xs text-center text-sm leading-relaxed text-paper/65">
          Cả bàn hỏi Quản trò để tìm ra từ khóa. Nhưng có một người <b className="text-paper">đã biết trước</b>… Ai là Nội
          gián?
        </p>

        <div className="paper mt-6 rounded-3xl p-5">
          <motion.div
            key={session ? 'play' : 'login'}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            {session ? <PlayForm {...props} session={session} /> : <LoginForm onLogin={props.onLogin} />}
          </motion.div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-4 text-xs">
          <button type="button" onClick={onShowRules} className="text-paper/70 underline-offset-4 hover:text-paper hover:underline">
            Luật chơi
          </button>
          <span className="flex items-center gap-1.5 text-paper/50">
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-teal' : 'animate-pulse bg-vermilion'}`} />
            {connected ? 'Đã kết nối máy chủ' : 'Đang kết nối…'}
          </span>
        </div>
      </motion.div>
    </div>
  );
}

/* --------------------------------------------------------------- login */

function LoginForm({ onLogin }: { onLogin: (s: Session) => void }) {
  const login = useEmailLogin(authClient, {
    onLogin: (s) => {
      sfx.join();
      onLogin(s);
    },
    onSent: sfx.send,
    onError: sfx.error,
  });
  const { email, code, busy, error, notice, devCode, cooldown } = login;

  if (login.step === 'email') {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void login.send();
        }}
      >
        <h2 className="display text-2xl font-bold uppercase tracking-wide text-ink">Đăng nhập</h2>
        <p className="mt-0.5 text-xs text-ink-soft">Nhập email, chúng tôi sẽ gửi cho bạn một mã 6 số.</p>

        <label className="label mt-4" htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => login.setEmail(e.target.value)}
          placeholder="ban@vidu.com"
          className="field mt-1.5"
          autoFocus
        />
        {error && <p className="mt-2 text-xs font-medium text-vermilion">{error}</p>}

        <button type="submit" disabled={!login.emailOk || busy} className="btn btn-red mt-4 w-full">
          {busy ? 'Đang gửi…' : 'Gửi mã đăng nhập'}
        </button>
      </form>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void login.verify();
      }}
    >
      <h2 className="display text-2xl font-bold uppercase tracking-wide text-ink">Nhập mã</h2>
      <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
        Đã gửi mã tới <span className="font-semibold text-ink">{email.trim()}</span>. Xem cả thư mục Spam nếu chưa thấy.
      </p>

      <input
        ref={login.codeRef}
        value={code}
        onChange={(e) => login.typeCode(e.target.value)}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="••••••"
        aria-label="Mã 6 số"
        className="field display mt-4 text-center text-3xl font-bold tracking-[0.5em] placeholder:tracking-[0.5em]"
        autoFocus
      />
      {devCode && (
        <p className="mt-2 rounded-lg bg-paper-2 px-2.5 py-1.5 text-[11px] text-ink-soft">
          Máy chủ chưa cấu hình gửi mail (chế độ dev) — mã là{' '}
          <button type="button" className="font-bold text-vermilion underline" onClick={() => void login.verify(devCode)}>
            {devCode}
          </button>
        </p>
      )}
      {notice && !error && <p className="mt-2 text-xs text-teal">{notice}</p>}
      {error && <p className="mt-2 text-xs font-medium text-vermilion">{error}</p>}

      <button type="submit" disabled={code.length !== 6 || busy} className="btn btn-red mt-4 w-full">
        {busy ? 'Đang kiểm tra…' : 'Xác nhận'}
      </button>

      <div className="mt-3 flex items-center justify-between text-xs">
        <button type="button" onClick={login.changeEmail} className="text-ink-soft hover:text-ink">
          ← Đổi email
        </button>
        <button
          type="button"
          disabled={cooldown > 0 || busy}
          onClick={() => void login.send()}
          className="font-semibold text-teal disabled:text-ink/30"
        >
          {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : 'Gửi lại mã'}
        </button>
      </div>
    </form>
  );
}

/* ---------------------------------------------------------------- play */

export function AvatarPicker({
  value,
  onChange,
  taken = [],
}: {
  value: number;
  onChange: (a: number) => void;
  taken?: number[];
}) {
  return (
    <div className="grid grid-cols-8 gap-1">
      {AVATARS.map((a, i) => {
        const busy = taken.includes(i) && i !== value;
        const active = value === i;
        return (
          <motion.button
            key={i}
            type="button"
            disabled={busy}
            onClick={() => {
              sfx.tap();
              onChange(i);
            }}
            whileHover={busy ? undefined : { y: -3, rotate: -4 }}
            animate={{ y: active ? -3 : 0, scale: active ? 1.08 : 1 }}
            className={`relative flex flex-col items-center rounded-xl pt-1 pb-1 ${busy ? 'opacity-25' : ''}`}
            aria-label={a.name}
            aria-pressed={active}
            title={a.name}
          >
            <Avatar id={i} size={34} mood={active ? 'happy' : 'calm'} />
            <span className="mt-1 h-1 w-4 rounded-full" style={{ background: active ? a.coat : 'transparent' }} />
          </motion.button>
        );
      })}
    </div>
  );
}

function PlayForm({ session, onLogout, name, avatar, onIdentity, onCreate, onJoin, connected }: Props & { session: Session }) {
  const [code, setCode] = useState('');
  const canPlay = connected && name.trim().length > 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 rounded-xl bg-paper-2 px-3 py-2 text-xs">
        <span className="flex min-w-0 items-center gap-1.5 text-ink-soft">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
          <span className="truncate">{session.user.email}</span>
        </span>
        <button type="button" onClick={onLogout} className="shrink-0 text-ink-soft hover:text-ink">
          Đăng xuất
        </button>
      </div>

      <label className="label mt-4" htmlFor="player-name">
        Bí danh
      </label>
      <input
        id="player-name"
        value={name}
        maxLength={14}
        onChange={(e) => onIdentity(e.target.value, avatar)}
        placeholder="Thám tử…"
        className="field display mt-1.5 text-lg font-semibold"
      />

      <span className="label mt-4">Chọn nhân vật</span>
      <div className="mt-1.5">
        <AvatarPicker value={avatar} onChange={(a) => onIdentity(name, a)} />
      </div>

      <div className="rule my-5" />

      {session.user.canHost ? (
        <>
          <button
            type="button"
            disabled={!canPlay}
            onClick={() => {
              sfx.select();
              onCreate();
            }}
            className="btn btn-red w-full text-base"
          >
            Mở bàn mới
          </button>

          <div className="my-3 flex items-center gap-3 text-[11px] text-ink-soft/70">
            <span className="rule flex-1" />
            hoặc vào bàn có sẵn
            <span className="rule flex-1" />
          </div>
        </>
      ) : (
        <p className="mb-3 text-xs leading-relaxed text-ink-soft">Nhập mã bàn mà chủ bàn gửi cho bạn.</p>
      )}

      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canPlay || code.length < 4) return;
          sfx.select();
          onJoin(code);
        }}
      >
        <input
          value={code}
          onChange={(e) =>
            setCode(
              e.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .slice(0, 4),
            )
          }
          placeholder="MÃ BÀN"
          aria-label="Mã bàn"
          className="field display min-w-0 text-center text-xl font-bold tracking-[0.35em] placeholder:text-sm placeholder:font-semibold placeholder:tracking-[0.2em]"
        />
        <button
          type="submit"
          disabled={!canPlay || code.length < 4}
          className={`btn shrink-0 ${session.user.canHost ? 'btn-ink' : 'btn-red'}`}
        >
          Vào
        </button>
      </form>
    </div>
  );
}
