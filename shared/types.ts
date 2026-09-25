/**
 * Wire types shared by the server (the referee) and the client (the view).
 * Everything here is plain JSON so it crosses Socket.IO untouched.
 */

export type Role = 'master' | 'insider' | 'common';

/**
 * lobby → reveal (roles, the keyword, "eyes closed") → qa (the hourglass) →
 * discussion (hourglass flipped) → vote1 (judge the guesser) → vote2 (point)
 * → tiebreak (the guesser decides) → result. A failed Q&A goes straight to result.
 */
export type Phase = 'lobby' | 'reveal' | 'qa' | 'discussion' | 'vote1' | 'vote2' | 'tiebreak' | 'result';

/** What the Master said. 'correct' ends the Q&A: the asker found the keyword. */
export type Answer = 'yes' | 'no' | 'unknown' | 'correct';

/** 'commons' = the Master and the Commons; 'none' = the hourglass ran out and everyone lost. */
export type Winner = 'commons' | 'insider' | 'none';

/** 'bot': a bot answers from the predicate list, so a lone person can play the other roles. */
export type MasterMode = 'rotate' | 'random' | 'bot';

export interface Settings {
  /** length of the Q&A hourglass */
  qaSeconds: number;
  /** who holds the Master tile each round */
  masterMode: MasterMode;
}

export interface Question {
  id: number;
  playerId: string;
  /** 'guess' is a named keyword; the server checks it itself */
  kind: 'ask' | 'guess';
  text: string;
  /** null while the Master has not answered */
  answer: Answer | null;
  at: number;
}

export interface PublicPlayer {
  id: string;
  name: string;
  /** index into the avatar set */
  avatar: number;
  isBot: boolean;
  connected: boolean;
  /** rounds won at this table */
  wins: number;
  /** seated in the current round (people who joined between rounds wait for the next) */
  inRound: boolean;
  /** a role the whole table knows: the Master always, the guesser after vote 1, everyone at the end */
  role?: Role;
  /** discussion: wants to vote now */
  ready: boolean;
  /** has cast a vote in the current vote (not what it was) */
  voted: boolean;
}

export interface Vote1Result {
  /** said "the guesser is the Insider" */
  yes: string[];
  no: string[];
  /** a strict majority of the votes cast said yes */
  convicted: boolean;
}

export interface Vote2Result {
  /** voter → the player they pointed at */
  votes: Record<string, string>;
  tally: Record<string, number>;
  /** everyone with the most votes */
  top: string[];
}

export type ResultReason = 'timeout' | 'vote1' | 'vote2';

export interface RoundResult {
  winner: Winner;
  reason: ResultReason;
  word: string;
  cardId: string;
  row: number;
  masterId: string;
  insiderId: string;
  guesserId?: string;
  /** who was convicted (vote 1) or picked (vote 2) */
  accusedId?: string;
  roles: Record<string, Role>;
  winners: string[];
}

export interface GameState {
  roomCode: string;
  phase: Phase;
  hostId: string;
  players: PublicPlayer[];
  settings: Settings;
  /** 1-based count of rounds dealt at this table */
  round: number;
  masterId?: string;
  guesserId?: string;
  /** public once somebody has found it, or at the end */
  word?: string;
  questions: Question[];
  /** server epoch ms */
  phaseStartedAt?: number;
  /** when the current phase ends by itself (server epoch ms) */
  deadline?: number;
  /** how long the Q&A lasted; the hourglass is flipped and runs this long again */
  qaElapsed?: number;
  /** vote 1, once everybody has voted (the hands go up together) */
  vote1?: Vote1Result;
  /** vote 2 candidates: whoever still hides their role */
  candidates?: string[];
  vote2?: Vote2Result;
  /** the players the guesser must choose between */
  tiedIds?: string[];
  /** picked by vote 2 or by the guesser */
  chosenId?: string;
  result?: RoundResult;
  /** server clock at send time, so countdowns agree across devices */
  now: number;
}

/** What only one seat may know. */
export interface PrivateState {
  role: Role | null;
  /** the keyword, for the Master and the Insider */
  word: string | null;
  /** the card the keyword came from and its row (Master and Insider) */
  card: { id: string; words: string[]; row: number } | null;
  vote1: boolean | null;
  vote2: string | null;
}

export interface ChatMessage {
  id: number;
  /** '' for table announcements */
  playerId: string;
  name: string;
  avatar: number;
  text: string;
  /** epoch ms */
  at: number;
  system?: boolean;
}
