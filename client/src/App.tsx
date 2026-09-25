/** Connects the socket, holds the authoritative snapshot and this seat's secrets, picks the screen. */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage, GameState, PrivateState, Settings } from '@shared/types';
import {
  getSocket,
  loadIdentity,
  loadLastRoom,
  loadSession,
  reconnectSocket,
  saveIdentity,
  saveLastRoom,
  saveSession,
  type Identity,
  type Session,
  type SessionUser,
} from './lib/net';
import { syncClock } from './lib/clock';
import { isMuted, setMuted, sfx } from './lib/sound';
import { Backdrop } from './components/Backdrop';
import { Home } from './components/Home';
import { Lobby } from './components/Lobby';
import { GameScreen } from './components/GameScreen';
import { Toast } from './components/Overlays';
import { RulesModal } from './components/RulesModal';
import type { ChatItem } from './components/Chat';

export default function App() {
  const [session, setSession] = useState<Session | null>(loadSession);
  const [identity, setIdentity] = useState<Identity>(loadIdentity);
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [state, setState] = useState<GameState | null>(null);
  const [priv, setPriv] = useState<PrivateState | null>(null);
  const [connected, setConnected] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [muted, setMutedState] = useState(isMuted);

  // The socket effect runs once, so it reads the identity through a ref
  // rather than re-subscribing on every keystroke in the name field.
  const identityRef = useRef(identity);
  identityRef.current = identity;

  const socket = getSocket();
  const youId = session?.user.id ?? '';

  const toastTimer = useRef<number>();
  const showToast = useCallback((message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  /* ------------------------------------------------------------ socket */

  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
      // A refresh (or a dropped connection) walks straight back into the seat.
      const code = loadLastRoom();
      if (!code || !loadSession()) return;
      const { name, avatar } = identityRef.current;
      socket.emit('room:join', { roomCode: code, name, avatar }, (res: { error?: string }) => {
        if (res?.error) {
          // The table is gone (server restarted, or it was swept away).
          saveLastRoom(null);
          setState(null);
          setPriv(null);
        }
      });
    };
    const onDisconnect = () => setConnected(false);
    const onState = (s: GameState) => {
      syncClock(s.now);
      setState(s);
    };
    const onPrivate = (p: PrivateState) => setPriv(p);
    const onError = ({ message }: { message: string }) => {
      sfx.error();
      showToast(message);
    };
    // The server tells us who it thinks we are; a stale token means logging in again.
    const onSession = ({ user }: { user: SessionUser | null }) => {
      const local = loadSession();
      if (local && !user) {
        saveSession(null);
        setSession(null);
        setState(null);
        showToast('Phiên đăng nhập đã hết hạn, hãy đăng nhập lại');
      } else if (local && user && local.user.canHost !== user.canHost) {
        // Host rights live on the server and can change; keep our copy in step.
        const next = { ...local, user };
        saveSession(next);
        setSession(next);
      }
    };
    const onChatHistory = (msgs: ChatMessage[]) => setChat(msgs.map((m) => ({ ...m, recvAt: 0 })));
    const onChatMsg = (m: ChatMessage) => {
      setChat((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev.slice(-119), { ...m, recvAt: Date.now() }]));
      if (!m.system && m.playerId !== loadSession()?.user.id) sfx.chat();
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('state', onState);
    socket.on('private', onPrivate);
    socket.on('errorMsg', onError);
    socket.on('session', onSession);
    socket.on('chat:history', onChatHistory);
    socket.on('chat:msg', onChatMsg);
    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('state', onState);
      socket.off('private', onPrivate);
      socket.off('errorMsg', onError);
      socket.off('session', onSession);
      socket.off('chat:history', onChatHistory);
      socket.off('chat:msg', onChatMsg);
    };
  }, [socket, showToast]);

  /* ----------------------------------------------------------- actions */

  const login = useCallback((next: Session) => {
    saveSession(next);
    setSession(next);
    // First visit: suggest a display name from the email, which they can change.
    setIdentity((prev) => {
      if (prev.name.trim()) return prev;
      const suggested = { ...prev, name: next.user.email.split('@')[0].slice(0, 14) };
      saveIdentity(suggested);
      return suggested;
    });
    reconnectSocket();
  }, []);

  const clearTable = useCallback(() => {
    saveLastRoom(null);
    setState(null);
    setPriv(null);
    setChat([]);
  }, []);

  const logout = useCallback(() => {
    socket.emit('room:leave');
    saveSession(null);
    setSession(null);
    clearTable();
    reconnectSocket();
  }, [socket, clearTable]);

  const updateIdentity = useCallback((name: string, avatar: number) => {
    setIdentity((prev) => {
      const next = { ...prev, name, avatar };
      saveIdentity(next);
      return next;
    });
  }, []);

  const createRoom = useCallback(() => {
    const { name, avatar } = identity;
    socket.emit('room:create', { name, avatar }, (res: { roomCode?: string; error?: string }) => {
      if (res?.roomCode) {
        setChat([]);
        saveLastRoom(res.roomCode);
      } else if (res?.error) showToast(res.error);
    });
  }, [socket, identity, showToast]);

  const joinRoom = useCallback(
    (code: string) => {
      const { name, avatar } = identity;
      socket.emit('room:join', { roomCode: code, name, avatar }, (res: { roomCode?: string; error?: string }) => {
        if (res?.roomCode) saveLastRoom(res.roomCode);
        else if (res?.error) showToast(res.error);
      });
    },
    [socket, identity, showToast],
  );

  const leave = useCallback(() => {
    const midRound = state && state.phase !== 'lobby' && state.phase !== 'result';
    if (midRound && !window.confirm('Rời bàn giữa ván? Ghế của bạn vẫn được giữ nếu bạn quay lại bằng mã bàn.')) return;
    socket.emit('room:leave');
    clearTable();
  }, [socket, clearTable, state]);

  const send = useCallback((event: string, payload?: object) => socket.emit(event, payload ?? {}), [socket]);
  const sendChat = useCallback((text: string) => socket.emit('chat:send', { text }), [socket]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  }, [muted]);

  /* ------------------------------------------------------------ render */

  const me = session ? state?.players.find((p) => p.id === youId) : undefined;
  const showRules = useCallback(() => setRulesOpen(true), []);

  return (
    <>
      <Backdrop dim={!!state && state.phase !== 'lobby'} />
      <Toast message={toast} />

      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}

      {!state || !me ? (
        <Home
          session={session}
          onLogin={login}
          onLogout={logout}
          name={identity.name}
          avatar={identity.avatar}
          onIdentity={updateIdentity}
          onCreate={createRoom}
          onJoin={joinRoom}
          connected={connected}
          onShowRules={showRules}
        />
      ) : state.phase === 'lobby' ? (
        <Lobby
          state={state}
          youId={youId}
          onStart={() => send('game:start')}
          onAddBot={() => send('room:addBot')}
          onKick={(id) => send('room:kick', { id })}
          onAvatar={(avatar) => {
            updateIdentity(identity.name, avatar);
            send('room:avatar', { avatar });
          }}
          onSettings={(s: Partial<Settings>) => send('room:settings', s)}
          onLeave={leave}
          onShowRules={showRules}
          chat={chat}
          onSendChat={sendChat}
        />
      ) : (
        <GameScreen
          state={state}
          priv={priv}
          youId={youId}
          chat={chat}
          muted={muted}
          onToggleMute={toggleMute}
          onSendChat={sendChat}
          send={send}
          onLeave={leave}
          onShowRules={showRules}
        />
      )}
    </>
  );
}
