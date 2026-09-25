/**
 * One table: who sits at it, the round in progress, and the chat. It is the
 * whole state machine: lobby → reveal → qa → discussion → vote1 → vote2 →
 * tiebreak → result. Clients only send intents; each method returns an
 * error string or null. Time passes in tick(), with the clock and the rng
 * injected so the tests can play a round in milliseconds.
 */

import {
  DEFAULT_SETTINGS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  AVATAR_COUNT,
  afterVote1,
  answerMatches,
  dealRoles,
  discussionMs,
  drawKeyword,
  insiderOf,
  judgeGuesser,
  mentionsKeyword,
  newDeck,
  pickMaster,
  sameGuess,
  tally,
  topOf,
  vote2Candidates,
  winnersFor,
} from '../../shared/engine';
import {
  GUESS_COOLDOWN_MS,
  MAX_PENDING_ASKS,
  QA_OPTIONS,
  REVEAL,
  TIEBREAK_MS,
  VOTE_MS,
  VOTE_REVEAL_MS,
} from '../../shared/timing';
import type {
  Answer,
  ChatMessage,
  GameState,
  Phase,
  PrivateState,
  PublicPlayer,
  Question,
  ResultReason,
  Role,
  RoundResult,
  Settings,
  Vote1Result,
  Vote2Result,
  Winner,
} from '../../shared/types';
import { CARDS } from '../../shared/words';
import { PREDICATE_BY_ID, masterAnswer } from '../../shared/knowledge';
import * as bot from './bot';

/** A host who has been gone this long hands the table to someone who is here. */
const HOST_GRACE_MS = 20_000;
const MAX_QUESTIONS = 240;
/** A bot Master "reads" a question this long before stamping it. */
const BOT_MASTER_READ_MS = 1200;

export interface Player {
  id: string;
  name: string;
  avatar: number;
  isBot: boolean;
  connected: boolean;
  socketId?: string;
  /** epoch ms of the disconnect */
  disconnectedAt?: number;
  wins: number;
}

interface Round {
  no: number;
  /** everybody dealt a tile this round, in seat order */
  ids: string[];
  roles: Record<string, Role>;
  masterId: string;
  insiderId: string;
  cardId: string;
  row: number;
  word: string;
  questions: Question[];
  /** questions the bots asked from the predicate list */
  predicateOf: Map<number, string>;
  qaStartedAt: number;
  qaElapsed?: number;
  guesserId?: string;
  ready: Set<string>;
  votes1: Record<string, boolean>;
  vote1?: Vote1Result;
  candidates: string[];
  votes2: Record<string, string>;
  vote2?: Vote2Result;
  tiedIds?: string[];
  chosenId?: string;
  result?: RoundResult;
  lastGuessAt: Record<string, number>;
  /** when each bot next does something */
  botNext: Record<string, number>;
  botTalked: Set<string>;
}

export interface RoomOptions {
  now?: () => number;
  rng?: () => number;
}

export class Room {
  code: string;
  players: Player[] = [];
  hostId = '';
  phase: Phase = 'lobby';
  settings: Settings = { ...DEFAULT_SETTINGS };
  round: Round | null = null;
  roundNo = 0;
  phaseStartedAt = 0;
  deadline?: number;
  chat: ChatMessage[] = [];
  lastActivity: number;

  readonly now: () => number;
  readonly rng: () => number;

  private prevMasterId?: string;
  private deck: string[];
  private used = new Set<string>();
  private questionSeq = 0;
  private chatSeq = 0;
  /** chat lines made inside the room (announcements, bot talk) still to be sent */
  private outbox: ChatMessage[] = [];

  constructor(code: string, opts: RoomOptions = {}) {
    this.code = code;
    this.now = opts.now ?? Date.now;
    this.rng = opts.rng ?? Math.random;
    this.deck = newDeck(this.rng);
    this.lastActivity = this.now();
  }

  /* --------------------------------------------------------- membership */

  private freeAvatar(wanted: number): number {
    const taken = new Set(this.players.map((p) => p.avatar));
    if (!taken.has(wanted)) return wanted;
    for (let a = 0; a < AVATAR_COUNT; a++) if (!taken.has(a)) return a;
    return wanted;
  }

  /** People join in the lobby, or between rounds (they play from the next one). */
  get seatsOpen(): boolean {
    return this.phase === 'lobby' || this.phase === 'result';
  }

  addPlayer(p: { id: string; name: string; avatar: number; isBot?: boolean; socketId?: string }): Player | null {
    if (!this.seatsOpen || this.players.length >= MAX_PLAYERS) return null;
    const player: Player = {
      id: p.id,
      name: p.name,
      avatar: this.freeAvatar(p.avatar),
      isBot: !!p.isBot,
      connected: true,
      socketId: p.socketId,
      wins: 0,
    };
    this.players.push(player);
    if (!this.hostId) this.hostId = player.id;
    this.system(`${player.name} đã vào bàn`);
    this.touch();
    return player;
  }

  removePlayer(id: string): void {
    const idx = this.players.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const [gone] = this.players.splice(idx, 1);
    this.system(`${gone.name} đã rời bàn`);
    if (this.hostId === id) this.hostId = this.players.find((p) => !p.isBot && p.connected)?.id ?? '';
    this.touch();
  }

  setAvatar(id: string, avatar: number): string | null {
    if (!this.seatsOpen) return 'Đang trong ván';
    const p = this.find(id);
    if (!p || !Number.isInteger(avatar) || avatar < 0 || avatar >= AVATAR_COUNT) return 'Nhân vật không hợp lệ';
    if (this.players.some((o) => o.id !== id && o.avatar === avatar)) return 'Nhân vật này đã có người chọn';
    p.avatar = avatar;
    this.touch();
    return null;
  }

  setSettings(byId: string, next: Partial<Settings>): string | null {
    if (byId !== this.hostId) return 'Chỉ chủ bàn mới đổi được';
    if (!this.seatsOpen) return 'Đang trong ván';
    if (next.qaSeconds !== undefined) {
      if (!(QA_OPTIONS as readonly number[]).includes(next.qaSeconds)) return 'Thời gian không hợp lệ';
      this.settings.qaSeconds = next.qaSeconds;
    }
    if (next.masterMode !== undefined) {
      if (!['rotate', 'random', 'bot'].includes(next.masterMode)) return 'Cách chọn Quản trò không hợp lệ';
      this.settings.masterMode = next.masterMode;
    }
    this.touch();
    return null;
  }

  find(id: string): Player | undefined {
    return this.players.find((p) => p.id === id);
  }

  name(id: string | undefined): string {
    return (id && this.find(id)?.name) || 'Ai đó';
  }

  setConnected(id: string, connected: boolean, socketId?: string): void {
    const p = this.find(id);
    if (!p) return;
    p.connected = connected;
    p.socketId = connected ? socketId : undefined;
    p.disconnectedAt = connected ? undefined : this.now();
    this.touch();
  }

  private inRound(id: string): boolean {
    return !!this.round && this.phase !== 'lobby' && this.round.ids.includes(id);
  }

  /** Seats that can still act: bots, and people who are online. */
  private active(ids: string[]): string[] {
    return ids.filter((id) => {
      const p = this.find(id);
      return p && (p.isBot || p.connected);
    });
  }

  /* -------------------------------------------------------------- rounds */

  startRound(byId: string): string | null {
    if (byId !== this.hostId) return 'Chỉ chủ bàn mới bắt đầu được';
    if (!this.seatsOpen) return 'Ván đang diễn ra';
    // Seats whose owners walked away are freed before dealing.
    this.players = this.players.filter((p) => p.isBot || p.connected);
    if (this.players.length < MIN_PLAYERS) return `Cần ít nhất ${MIN_PLAYERS} người chơi`;
    const humans = this.players.filter((p) => !p.isBot).map((p) => p.id);
    const bots = this.players.filter((p) => p.isBot).map((p) => p.id);
    let masterId: string | undefined;
    if (this.settings.masterMode === 'bot') {
      masterId = bots[Math.floor(this.rng() * bots.length)];
      if (!masterId) return 'Cần ít nhất một bot để làm Quản trò';
    } else {
      masterId = pickMaster(humans, this.prevMasterId, this.settings.masterMode, this.rng);
      if (!masterId) return 'Cần ít nhất một người thật làm Quản trò';
    }

    const ids = this.players.map((p) => p.id);
    const roles = dealRoles(ids, masterId, this.rng);
    const kw = drawKeyword(this.deck, this.used, this.rng);
    this.roundNo += 1;
    this.round = {
      no: this.roundNo,
      ids,
      roles,
      masterId,
      insiderId: insiderOf(roles),
      ...kw,
      questions: [],
      predicateOf: new Map(),
      qaStartedAt: 0,
      ready: new Set(),
      votes1: {},
      candidates: [],
      votes2: {},
      lastGuessAt: {},
      botNext: {},
      botTalked: new Set(),
    };
    this.prevMasterId = masterId;
    this.enter('reveal', REVEAL.total);
    this.system(`Ván ${this.roundNo}: ${this.name(masterId)} là Quản trò. Mọi người nhắm mắt…`);
    return null;
  }

  backToLobby(byId: string): string | null {
    if (byId !== this.hostId) return 'Chỉ chủ bàn mới làm được';
    this.phase = 'lobby';
    this.round = null;
    this.deadline = undefined;
    this.players = this.players.filter((p) => p.isBot || p.connected);
    this.system('Quay lại phòng chờ');
    this.touch();
    return null;
  }

  private enter(phase: Phase, durationMs?: number): void {
    const now = this.now();
    this.phase = phase;
    this.phaseStartedAt = now;
    this.deadline = durationMs === undefined ? undefined : now + durationMs;
    this.touch();
  }

  /** Bots wait a human-looking moment before acting in the new phase. */
  private scheduleBots(minMs: number, spreadMs: number): void {
    const r = this.round!;
    const now = this.now();
    for (const id of r.ids) if (this.find(id)?.isBot) r.botNext[id] = now + minMs + this.rng() * spreadMs;
  }

  private beginQA(): void {
    const r = this.round!;
    this.enter('qa', this.settings.qaSeconds * 1000);
    r.qaStartedAt = this.phaseStartedAt;
    this.scheduleBots(4000, 7000);
    r.botNext[r.masterId] = this.phaseStartedAt;
    this.system('Mở mắt! Đồng hồ cát bắt đầu chảy — hãy hỏi Quản trò.');
  }

  /* ---------------------------------------------------------------- Q&A */

  private pushQuestion(playerId: string, kind: Question['kind'], text: string, answer: Answer | null): Question {
    const r = this.round!;
    const q: Question = { id: ++this.questionSeq, playerId, kind, text, answer, at: this.now() };
    r.questions.push(q);
    if (r.questions.length > MAX_QUESTIONS) r.questions.splice(0, r.questions.length - MAX_QUESTIONS);
    this.touch();
    return q;
  }

  private canQuestion(id: string): string | null {
    const r = this.round;
    if (!r || this.phase !== 'qa') return 'Chưa tới lúc hỏi';
    if (!r.ids.includes(id)) return 'Bạn đang chờ ván sau';
    if (id === r.masterId) return 'Quản trò chỉ trả lời thôi';
    return null;
  }

  ask(id: string, raw: string, predicateId?: string): string | null {
    const err = this.canQuestion(id);
    if (err) return err;
    const r = this.round!;
    // A question from the list is asked word for word, so its answer means one thing.
    const listed = predicateId ? PREDICATE_BY_ID.get(predicateId) : undefined;
    const text = listed?.text ?? String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 140);
    if (text.length < 2) return 'Câu hỏi ngắn quá';
    const waiting = r.questions.filter((q) => q.playerId === id && q.answer === null).length;
    if (waiting >= MAX_PENDING_ASKS) return 'Chờ Quản trò trả lời câu trước đã';
    const q = this.pushQuestion(id, 'ask', text, null);
    if (listed) r.predicateOf.set(q.id, listed.id);
    return null;
  }

  guess(id: string, raw: string): string | null {
    const err = this.canQuestion(id);
    if (err) return err;
    const r = this.round!;
    const text = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 48);
    if (!text) return 'Hãy gõ từ bạn đoán';
    const now = this.now();
    const wait = (r.lastGuessAt[id] ?? 0) + GUESS_COOLDOWN_MS - now;
    if (wait > 0) return `Chờ ${Math.ceil(wait / 1000)} giây nữa rồi đoán tiếp`;
    const right = answerMatches(r.word, text);
    if (!right && r.questions.some((q) => q.kind === 'guess' && q.answer === 'no' && sameGuess(q.text, text))) {
      return 'Từ này đã có người đoán rồi';
    }
    r.lastGuessAt[id] = now;
    this.pushQuestion(id, 'guess', text, right ? 'correct' : 'no');
    if (right) this.found(id);
    return null;
  }

  /** The Master answers (or corrects an answer). "Đúng rồi!" ends the Q&A. */
  answer(id: string, questionId: number, answer: Answer): string | null {
    const r = this.round;
    if (!r || this.phase !== 'qa') return 'Chưa tới lúc trả lời';
    if (id !== r.masterId) return 'Chỉ Quản trò mới trả lời';
    if (!['yes', 'no', 'unknown', 'correct'].includes(answer)) return 'Câu trả lời không hợp lệ';
    const q = r.questions.find((x) => x.id === questionId);
    if (!q) return 'Không tìm thấy câu hỏi';
    q.answer = answer;
    this.touch();
    if (answer === 'correct') this.found(q.playerId);
    return null;
  }

  /** The keyword is out: the hourglass is turned over for the discussion. */
  private found(guesserId: string): void {
    const r = this.round!;
    r.guesserId = guesserId;
    r.qaElapsed = this.now() - r.qaStartedAt;
    this.enter('discussion', discussionMs(r.qaElapsed, this.settings.qaSeconds * 1000));
    r.ready.clear();
    this.scheduleBots(3000, 6000);
    this.system(`🎉 ${this.name(guesserId)} đã tìm ra từ khóa “${r.word}”! Lật đồng hồ — ai là Nội gián?`);
  }

  setReady(id: string, ready: boolean): string | null {
    const r = this.round;
    if (!r || this.phase !== 'discussion') return 'Chưa tới lúc biểu quyết';
    if (!r.ids.includes(id)) return 'Bạn đang chờ ván sau';
    if (ready) r.ready.add(id);
    else r.ready.delete(id);
    this.touch();
    return null;
  }

  /* -------------------------------------------------------------- votes */

  private beginVote1(): void {
    const r = this.round!;
    r.votes1 = {};
    r.vote1 = undefined;
    this.enter('vote1', VOTE_MS);
    this.scheduleBots(1500, 4000);
    this.system(`Biểu quyết: ${this.name(r.guesserId)} có phải là Nội gián không?`);
  }

  castVote1(id: string, yes: boolean): string | null {
    const r = this.round;
    if (!r || this.phase !== 'vote1' || r.vote1) return 'Chưa tới lúc bỏ phiếu';
    if (!r.ids.includes(id)) return 'Bạn đang chờ ván sau';
    if (id === r.guesserId) return 'Người bị xét không bỏ phiếu';
    r.votes1[id] = !!yes;
    this.touch();
    return null;
  }

  private closeVote1(): void {
    const r = this.round!;
    r.vote1 = judgeGuesser(r.votes1);
    this.deadline = this.now() + VOTE_REVEAL_MS;
    const { yes, no, convicted } = r.vote1;
    const role = r.roles[r.guesserId!] === 'insider' ? 'NỘI GIÁN' : 'Thường dân';
    this.system(
      `${yes.length} phiếu CÓ, ${no.length} phiếu KHÔNG → ${convicted ? 'kết tội' : 'tin là vô tội'}. ${this.name(r.guesserId)} lật vai: ${role}!`,
    );
    this.touch();
  }

  private afterVote1(): void {
    const r = this.round!;
    const guesserIsInsider = r.guesserId === r.insiderId;
    const winner = afterVote1(r.vote1!.convicted, guesserIsInsider);
    if (winner) this.finish(winner, 'vote1', r.vote1!.convicted ? r.guesserId : undefined);
    else this.beginVote2();
  }

  private beginVote2(): void {
    const r = this.round!;
    r.candidates = vote2Candidates(r.ids, r.masterId, r.guesserId);
    r.votes2 = {};
    r.vote2 = undefined;
    this.enter('vote2', VOTE_MS);
    this.scheduleBots(1500, 4000);
    this.system('Lần bỏ phiếu cuối: cùng chỉ vào người bạn nghi là Nội gián!');
  }

  castVote2(id: string, target: string): string | null {
    const r = this.round;
    if (!r || this.phase !== 'vote2' || r.vote2) return 'Chưa tới lúc bỏ phiếu';
    if (!r.ids.includes(id)) return 'Bạn đang chờ ván sau';
    if (target === id) return 'Không tự chỉ vào mình được';
    if (!r.candidates.includes(target)) return 'Người này đã lộ vai rồi';
    r.votes2[id] = target;
    this.touch();
    return null;
  }

  private closeVote2(): void {
    const r = this.round!;
    const t = tally(r.votes2, r.candidates);
    r.vote2 = { votes: { ...r.votes2 }, tally: t, top: topOf(t) };
    this.deadline = this.now() + VOTE_REVEAL_MS;
    this.touch();
  }

  private afterVote2(): void {
    const r = this.round!;
    const top = r.vote2!.top;
    if (top.length === 1) return this.decide(top[0]);
    r.tiedIds = top;
    this.enter('tiebreak', TIEBREAK_MS);
    this.scheduleBots(2500, 3000);
    this.system(`Hoà phiếu! ${this.name(r.guesserId)} — người đoán ra từ khóa — sẽ quyết định.`);
  }

  breakTie(id: string, target: string): string | null {
    const r = this.round;
    if (!r || this.phase !== 'tiebreak') return 'Không có hoà phiếu';
    if (id !== r.guesserId) return 'Chỉ người đoán ra từ khóa mới quyết định';
    if (!r.tiedIds?.includes(target)) return 'Hãy chọn một người đang hoà phiếu';
    this.decide(target);
    return null;
  }

  private decide(chosenId: string): void {
    const r = this.round!;
    r.chosenId = chosenId;
    this.finish(chosenId === r.insiderId ? 'commons' : 'insider', 'vote2', chosenId);
  }

  private finish(winner: Winner, reason: ResultReason, accusedId?: string): void {
    const r = this.round!;
    const winners = winnersFor(winner, r.roles);
    for (const id of winners) {
      const p = this.find(id);
      if (p) p.wins += 1;
    }
    r.result = {
      winner,
      reason,
      word: r.word,
      cardId: r.cardId,
      row: r.row,
      masterId: r.masterId,
      insiderId: r.insiderId,
      guesserId: r.guesserId,
      accusedId,
      roles: { ...r.roles },
      winners,
    };
    this.enter('result');
    const insider = this.name(r.insiderId);
    if (winner === 'none') this.system(`⌛ Hết giờ! Không ai tìm ra “${r.word}” — cả bàn cùng thua. Nội gián là ${insider}.`);
    else if (winner === 'commons') this.system(`🔎 Bắt được Nội gián ${insider}! Quản trò và Thường dân thắng.`);
    else this.system(`🕶️ Nội gián ${insider} đã qua mặt cả bàn và giành chiến thắng!`);
  }

  /* --------------------------------------------------------------- clock */

  /** Advances deadlines and bots. Returns true when the table changed. */
  tick(): boolean {
    const now = this.now();
    let changed = this.handOffHost(now);
    const r = this.round;
    if (!r || this.phase === 'lobby' || this.phase === 'result') return changed;
    const due = this.deadline !== undefined && now >= this.deadline;

    switch (this.phase) {
      case 'reveal':
        if (due) {
          this.beginQA();
          changed = true;
        }
        break;
      case 'qa':
        if (due) {
          this.finish('none', 'timeout');
          changed = true;
        } else changed = this.botsQA(now) || changed;
        break;
      case 'discussion': {
        changed = this.botsDiscuss(now) || changed;
        const everyone = this.active(r.ids).every((id) => r.ready.has(id));
        if (due || everyone) {
          this.beginVote1();
          changed = true;
        }
        break;
      }
      case 'vote1':
        if (r.vote1) {
          if (due) {
            this.afterVote1();
            changed = true;
          }
          break;
        }
        changed = this.botsVote(now) || changed;
        if (due || this.active(r.ids.filter((id) => id !== r.guesserId)).every((id) => id in r.votes1)) {
          this.closeVote1();
          changed = true;
        }
        break;
      case 'vote2':
        if (r.vote2) {
          if (due) {
            this.afterVote2();
            changed = true;
          }
          break;
        }
        changed = this.botsVote(now) || changed;
        if (due || this.active(r.ids).every((id) => id in r.votes2)) {
          this.closeVote2();
          changed = true;
        }
        break;
      case 'tiebreak': {
        const g = this.find(r.guesserId ?? '');
        const tied = r.tiedIds ?? [];
        const auto = !g || (!g.isBot && !g.connected) || due;
        if (auto || (g?.isBot && now >= (r.botNext[g.id] ?? 0))) {
          const pick = g?.isBot && !due ? bot.pointAt(g.id, tied, this.voteContext()) : undefined;
          this.decide(pick ?? tied[Math.floor(this.rng() * tied.length)]);
          changed = true;
        }
        break;
      }
    }
    return changed;
  }

  private handOffHost(now: number): boolean {
    const host = this.find(this.hostId);
    if (host?.connected) return false;
    if (host && now - (host.disconnectedAt ?? now) < HOST_GRACE_MS) return false;
    const next = this.players.find((p) => !p.isBot && p.connected);
    if (!next || next.id === this.hostId) return false;
    this.hostId = next.id;
    this.system(`${next.name} giờ là chủ bàn`);
    return true;
  }

  private voteContext(): bot.VoteContext {
    const r = this.round!;
    return {
      questions: r.questions,
      guesserId: r.guesserId,
      qaUsed: (r.qaElapsed ?? 0) / (this.settings.qaSeconds * 1000),
      rng: this.rng,
    };
  }

  /** A bot Master answers the oldest open question, one at a time, after a beat. */
  private botMasterAnswers(now: number): boolean {
    const r = this.round!;
    if (now < (r.botNext[r.masterId] ?? Infinity)) return false;
    const q = r.questions.find((x) => x.answer === null && now - x.at >= BOT_MASTER_READ_MS);
    if (!q) return false;
    r.botNext[r.masterId] = now + 800 + this.rng() * 1800;
    const { answer, predicate } = masterAnswer(r.word, q.text, r.predicateOf.get(q.id));
    // A typed question the bot understood is as good as one from the list.
    if (predicate) r.predicateOf.set(q.id, predicate.id);
    return !this.answer(r.masterId, q.id, answer);
  }

  private botsQA(now: number): boolean {
    const r = this.round!;
    if (this.find(r.masterId)?.isBot && this.botMasterAnswers(now)) return true;
    const pending = r.questions.filter((q) => q.answer === null).length;
    for (const id of r.ids) {
      const p = this.find(id);
      if (!p?.isBot || id === r.masterId || now < (r.botNext[id] ?? Infinity)) continue;
      const decision = bot.decideQA({
        view: { questions: r.questions, predicateOf: r.predicateOf },
        role: r.roles[id],
        word: r.roles[id] === 'insider' ? r.word : undefined,
        elapsed: (now - r.qaStartedAt) / (this.settings.qaSeconds * 1000),
        rng: this.rng,
      });
      r.botNext[id] = now + 6000 + this.rng() * 9000;
      if (!decision) continue;
      if (decision.kind === 'ask') {
        // Don't bury the Master: wait while several questions are open.
        if (pending >= 3) {
          r.botNext[id] = now + 2500 + this.rng() * 2500;
          continue;
        }
        return !this.ask(id, decision.text, decision.predicateId);
      }
      return !this.guess(id, decision.text);
    }
    return false;
  }

  private botsDiscuss(now: number): boolean {
    const r = this.round!;
    for (const id of r.ids) {
      const p = this.find(id);
      if (!p?.isBot || r.ready.has(id) || now < (r.botNext[id] ?? Infinity)) continue;
      if (!r.botTalked.has(id)) {
        r.botTalked.add(id);
        r.botNext[id] = now + 4000 + this.rng() * 6000;
        const names = new Map(this.players.map((x) => [x.id, x.name]));
        const line = bot.discussLine(id, r.roles[id], names, vote2Candidates(r.ids, r.masterId, undefined), this.voteContext());
        if (line) {
          const msg = this.addChat(id, line);
          if (msg && 'msg' in msg) this.outbox.push(msg.msg);
        }
        return true;
      }
      r.ready.add(id);
      return true;
    }
    return false;
  }

  private botsVote(now: number): boolean {
    const r = this.round!;
    let changed = false;
    for (const id of r.ids) {
      const p = this.find(id);
      if (!p?.isBot || now < (r.botNext[id] ?? Infinity)) continue;
      if (this.phase === 'vote1' && id !== r.guesserId && !(id in r.votes1)) {
        const suspects = r.ids.filter((x) => x !== r.masterId);
        changed = !this.castVote1(id, bot.voteOnGuesser(id, r.roles[id], suspects, this.voteContext())) || changed;
      } else if (this.phase === 'vote2' && !(id in r.votes2)) {
        const target = bot.pointAt(id, r.candidates, this.voteContext());
        if (target) changed = !this.castVote2(id, target) || changed;
      }
      r.botNext[id] = Infinity;
    }
    return changed;
  }

  /* -------------------------------------------------------------- views */

  publicState(): GameState {
    const r = this.round;
    const playing = !!r && this.phase !== 'lobby';
    const wordOut = playing && !['reveal', 'qa'].includes(this.phase);
    const roleOf = (id: string): Role | undefined => {
      if (!playing || !r!.ids.includes(id)) return undefined;
      if (this.phase === 'result' || id === r!.masterId) return r!.roles[id];
      if (id === r!.guesserId && r!.vote1) return r!.roles[id];
      return undefined;
    };
    const players: PublicPlayer[] = this.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isBot: p.isBot,
      connected: p.connected,
      wins: p.wins,
      inRound: this.inRound(p.id),
      role: roleOf(p.id),
      ready: this.phase === 'discussion' && !!r?.ready.has(p.id),
      voted:
        (this.phase === 'vote1' && !!r && p.id in r.votes1) || (this.phase === 'vote2' && !!r && p.id in r.votes2),
    }));
    return {
      roomCode: this.code,
      phase: this.phase,
      hostId: this.hostId,
      players,
      settings: { ...this.settings },
      round: this.roundNo,
      masterId: playing ? r!.masterId : undefined,
      guesserId: playing ? r!.guesserId : undefined,
      word: wordOut ? r!.word : undefined,
      questions: playing ? r!.questions : [],
      phaseStartedAt: this.phaseStartedAt,
      deadline: this.deadline,
      qaElapsed: playing ? r!.qaElapsed : undefined,
      vote1: playing ? r!.vote1 : undefined,
      candidates: playing && r!.candidates.length ? r!.candidates : undefined,
      vote2: playing ? r!.vote2 : undefined,
      tiedIds: playing ? r!.tiedIds : undefined,
      chosenId: playing ? r!.chosenId : undefined,
      result: playing ? r!.result : undefined,
      now: this.now(),
    };
  }

  privateState(id: string): PrivateState {
    const r = this.round;
    const role = r && this.phase !== 'lobby' ? (r.roles[id] ?? null) : null;
    const knows = role === 'master' || role === 'insider';
    const card = CARDS.find((c) => c.id === r?.cardId);
    return {
      role,
      word: knows ? r!.word : null,
      card: knows && card ? { id: card.id, words: card.words, row: r!.row } : null,
      vote1: r && id in r.votes1 ? r.votes1[id] : null,
      vote2: r?.votes2[id] ?? null,
    };
  }

  /* --------------------------------------------------------------- chat */

  addChat(playerId: string, raw: string): { msg: ChatMessage } | { error: string } | null {
    const p = this.find(playerId);
    const text = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 240);
    if (!p || !text) return null;
    const r = this.round;
    if (r && playerId === r.masterId && (this.phase === 'reveal' || this.phase === 'qa') && mentionsKeyword(r.word, text)) {
      return { error: 'Quản trò không được nói ra từ khóa!' };
    }
    const msg: ChatMessage = { id: ++this.chatSeq, playerId, name: p.name, avatar: p.avatar, text, at: this.now() };
    this.remember(msg);
    return { msg };
  }

  /** A table announcement, sent with the next broadcast. */
  system(text: string): void {
    const msg: ChatMessage = { id: ++this.chatSeq, playerId: '', name: '', avatar: 0, text, at: this.now(), system: true };
    this.remember(msg);
    this.outbox.push(msg);
  }

  drainOutbox(): ChatMessage[] {
    const out = this.outbox;
    this.outbox = [];
    return out;
  }

  private remember(msg: ChatMessage): void {
    this.chat.push(msg);
    if (this.chat.length > 120) this.chat = this.chat.slice(-120);
    this.touch();
  }

  touch(): void {
    this.lastActivity = this.now();
  }
}
