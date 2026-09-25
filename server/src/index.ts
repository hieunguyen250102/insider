/**
 * Insider (Nội gián) realtime server — Express + Socket.IO.
 * Deploys as a single always-on web service (Render, Fly, Railway…).
 */

import './env';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server, type Socket } from 'socket.io';

import { Room } from './room';
import { authError, authHandler, originPolicy, socketAuth } from 'oink-kit/server';
import { auth, type User } from './auth';
import { AVATAR_COUNT, MAX_PLAYERS } from '../../shared/engine';
import type { Answer, Settings } from '../../shared/types';

const PORT = Number(process.env.PORT) || 4200;
/** CLIENT_ORIGIN: comma list, `*` wildcards allowed (https://game-*.vercel.app); empty = any. */
const origins = originPolicy(process.env.CLIENT_ORIGIN);

const app = express();
// Render (and most hosts) sit behind a proxy; the rate limits need the real client IP.
app.set('trust proxy', 1);
app.use(cors({ origin: origins.corsOrigin }));
app.use(express.json({ limit: '4kb' }));
// POST /auth/request {email}, POST /auth/verify {email, code, challenge}
app.use(authHandler(auth));

const rooms = new Map<string, Room>();

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    rooms: rooms.size,
    sockets: io.engine.clientsCount,
    // false means HOST_EMAILS is unset and *anyone* who logs in can open a table
    hostRestricted: auth.hostingIsRestricted(),
    // what CLIENT_ORIGIN resolved to, so a CORS mismatch can be spotted from outside
    allowedOrigins: origins.origins,
    uptime: process.uptime(),
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: origins.corsOrigin, methods: ['GET', 'POST'] },
  pingInterval: 20000,
  pingTimeout: 25000,
});

/* ------------------------------------------------------------------ utils */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alikes

function newCode(): string {
  let code = '';
  do {
    code = Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function cleanName(name: unknown): string {
  const n = typeof name === 'string' ? name.replace(/\s+/g, ' ').trim().slice(0, 14) : '';
  return n || 'Thám tử';
}

function cleanAvatar(avatar: unknown): number {
  const a = Number(avatar);
  return Number.isInteger(a) && a >= 0 && a < AVATAR_COUNT ? a : 0;
}

const BOT_NAMES = ['Mũ Phớt', 'Cú Đêm', 'Kính Lúp', 'Bóng Mờ', 'Áo Choàng', 'Sói Xám', 'Mắt Diều Hâu', 'Ô Đen'];

/** The public snapshot to the whole table, each seat its own secrets, then any announcements. */
function broadcast(room: Room): void {
  io.to(room.code).emit('state', room.publicState());
  for (const p of room.players) {
    if (p.socketId) io.to(p.socketId).emit('private', room.privateState(p.id));
  }
  for (const msg of room.drainOutbox()) io.to(room.code).emit('chat:msg', msg);
}

/*
 * One clock for every table: deadlines, the hourglass, bots and host
 * hand-offs all happen inside Room.tick(); here we only relay the result.
 */
setInterval(() => {
  for (const room of rooms.values()) {
    if (room.tick()) broadcast(room);
  }
}, 200).unref();

/** Rooms nobody has touched for an hour are swept away. */
setInterval(
  () => {
    const cutoff = Date.now() - 60 * 60 * 1000;
    for (const [code, room] of rooms) {
      const anyoneHome = room.players.some((p) => p.connected && !p.isBot);
      if (!anyoneHome && room.lastActivity < cutoff) rooms.delete(code);
    }
  },
  5 * 60 * 1000,
).unref();

/* ---------------------------------------------------------------- sockets */

type Ack<T> = (res: T) => void;
type JoinAck = Ack<{ roomCode?: string; error?: string }>;

/** Anyone may connect, but only a signed-in socket gets a seat. */
io.use(socketAuth(auth));

io.on('connection', (socket: Socket) => {
  const user: User | null = socket.data.user;
  let joinedCode: string | null = null;
  let playerId: string | null = null;
  const chatTimes: number[] = [];

  socket.emit('session', { user });

  const fail = (msg: string) => socket.emit('errorMsg', { message: msg });
  const myRoom = () => (joinedCode ? rooms.get(joinedCode) : undefined);

  /** The same account open in two tabs: only the newest one owns the seat. */
  const ownsSeat = (room: Room) => !!playerId && room.find(playerId)?.socketId === socket.id;

  const enter = (room: Room, pid: string, ack?: JoinAck) => {
    socket.join(room.code);
    joinedCode = room.code;
    playerId = pid;
    ack?.({ roomCode: room.code });
    socket.emit('chat:history', room.chat);
    broadcast(room);
  };

  /** Runs a seated player's intent: a room method returning an error or null. */
  const act = (run: (room: Room, id: string) => string | null) => {
    const room = myRoom();
    if (!room || !playerId || !ownsSeat(room)) return;
    const err = run(room, playerId);
    if (err) return fail(err);
    broadcast(room);
  };

  socket.on('room:create', ({ name, avatar }: { name: string; avatar: number }, ack?: JoinAck) => {
    const denied = authError(user, { host: true });
    if (denied || !user) return ack?.({ error: denied });
    const room = new Room(newCode());
    rooms.set(room.code, room);
    const player = room.addPlayer({ id: user.id, name: cleanName(name), avatar: cleanAvatar(avatar), socketId: socket.id });
    if (!player) return ack?.({ error: 'Không tạo được bàn' });
    enter(room, user.id, ack);
  });

  socket.on(
    'room:join',
    ({ roomCode, name, avatar }: { roomCode: string; name: string; avatar: number }, ack?: JoinAck) => {
      const denied = authError(user);
      if (denied || !user) return ack?.({ error: denied });
      const room = rooms.get(String(roomCode ?? '').toUpperCase().trim());
      if (!room) return ack?.({ error: 'Không tìm thấy bàn' });

      if (room.find(user.id)) {
        // Reconnecting into a seat we already own — works mid-round too.
        room.setConnected(user.id, true, socket.id);
      } else {
        const player = room.addPlayer({ id: user.id, name: cleanName(name), avatar: cleanAvatar(avatar), socketId: socket.id });
        if (!player) {
          return ack?.({
            error: room.seatsOpen ? `Bàn đã đủ ${MAX_PLAYERS} người` : 'Ván đang diễn ra — chờ hết ván rồi vào nhé',
          });
        }
      }
      enter(room, user.id, ack);
    },
  );

  socket.on('room:addBot', () => {
    const room = myRoom();
    if (!room || room.hostId !== playerId || !room.seatsOpen) return;
    const used = new Set(room.players.map((p) => p.name));
    const name = BOT_NAMES.find((n) => !used.has(n)) ?? `Bot ${room.players.length}`;
    const taken = new Set(room.players.map((p) => p.avatar));
    const avatar = [...Array(AVATAR_COUNT).keys()].find((a) => !taken.has(a)) ?? 0;
    if (room.addPlayer({ id: `bot-${Math.random().toString(36).slice(2, 9)}`, name, avatar, isBot: true })) broadcast(room);
  });

  socket.on('room:kick', ({ id }: { id: string }) => {
    const room = myRoom();
    if (!room || room.hostId !== playerId || !room.seatsOpen || id === playerId) return;
    room.removePlayer(id);
    broadcast(room);
  });

  socket.on('room:avatar', ({ avatar }: { avatar: number }) => act((room, id) => room.setAvatar(id, Number(avatar))));

  socket.on('room:settings', (next: Partial<Settings> = {}) =>
    act((room, id) =>
      room.setSettings(id, {
        qaSeconds: next.qaSeconds === undefined ? undefined : Number(next.qaSeconds),
        masterMode: next.masterMode,
      }),
    ),
  );

  socket.on('game:start', () => act((room, id) => room.startRound(id)));
  socket.on('round:next', () => act((room, id) => room.startRound(id)));
  socket.on('room:lobby', () => act((room, id) => room.backToLobby(id)));

  socket.on('qa:ask', ({ text, predicateId }: { text?: string; predicateId?: string } = {}) =>
    act((room, id) => room.ask(id, String(text ?? ''), typeof predicateId === 'string' ? predicateId : undefined)),
  );
  socket.on('qa:guess', ({ text }: { text?: string } = {}) => act((room, id) => room.guess(id, String(text ?? ''))));
  socket.on('qa:answer', ({ id: qid, answer }: { id?: number; answer?: Answer } = {}) =>
    act((room, id) => room.answer(id, Number(qid), answer as Answer)),
  );

  socket.on('discuss:ready', ({ ready }: { ready?: boolean } = {}) => act((room, id) => room.setReady(id, !!ready)));
  socket.on('vote1:cast', ({ yes }: { yes?: boolean } = {}) => act((room, id) => room.castVote1(id, !!yes)));
  socket.on('vote2:cast', ({ target }: { target?: string } = {}) =>
    act((room, id) => room.castVote2(id, String(target ?? ''))),
  );
  socket.on('tiebreak:pick', ({ target }: { target?: string } = {}) =>
    act((room, id) => room.breakTie(id, String(target ?? ''))),
  );

  socket.on('chat:send', ({ text }: { text?: string } = {}) => {
    const room = myRoom();
    if (!room || !playerId || typeof text !== 'string') return;
    const now = Date.now();
    while (chatTimes.length && now - chatTimes[0] > 5000) chatTimes.shift();
    if (chatTimes.length >= 5) return fail('Bạn chat nhanh quá, chậm lại chút');
    const res = room.addChat(playerId, text);
    if (!res) return;
    if ('error' in res) return fail(res.error);
    chatTimes.push(now);
    io.to(room.code).emit('chat:msg', res.msg);
  });

  const leaveSeat = () => {
    const room = myRoom();
    if (!room || !playerId || !ownsSeat(room)) return null;
    if (room.phase === 'lobby') room.removePlayer(playerId);
    else room.setConnected(playerId, false);
    broadcast(room);
    return room;
  };

  socket.on('room:leave', () => {
    const room = myRoom();
    leaveSeat();
    if (room) socket.leave(room.code);
    joinedCode = null;
  });

  socket.on('disconnect', () => {
    leaveSeat();
  });
});

server.listen(PORT, () => {
  console.log(`Insider server listening on :${PORT}`);
});
