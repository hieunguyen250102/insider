/**
 * Phase lengths. The server enforces them; the client uses the same numbers
 * to pace its animations (the "eyes closed" sequence is a fixed script).
 */

/** Deal → the Master reads the keyword → the Insider peeks → eyes open. */
export const REVEAL = {
  /** everyone turns over their role tile */
  roles: 0,
  /** eyes closed, the Master reads the keyword */
  master: 3800,
  /** the Master closes their eyes, the Insider looks for a few seconds */
  insider: 7600,
  /** "open your eyes" */
  open: 11200,
  /** the Q&A starts */
  total: 13400,
} as const;

/** Hourglass options offered in the lobby, in seconds. */
export const QA_OPTIONS = [180, 240, 300, 420] as const;
export const DEFAULT_QA_SECONDS = 300;

/** The flipped hourglass runs as long as the Q&A took, but never less than this. */
export const DISCUSS_MIN_MS = 30_000;

/** Time to cast a vote before the table moves on without the missing ones. */
export const VOTE_MS = 45_000;
/** Everyone's hands (or fingers) stay up this long before the next step. */
export const VOTE_REVEAL_MS = 5_500;
/** The guesser breaks a tie in vote 2. */
export const TIEBREAK_MS = 25_000;

/** One guess every few seconds, so nobody reads out the whole word list. */
export const GUESS_COOLDOWN_MS = 3_000;
/** Questions a player may have waiting for the Master at once. */
export const MAX_PENDING_ASKS = 2;
