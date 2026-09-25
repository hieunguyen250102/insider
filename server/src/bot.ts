/**
 * Bots for trying the game with few friends. They hold the Master tile only
 * in 'bot' mode (masterAnswer in shared/knowledge.ts); as Commons or Insider
 * they ask the questions in knowledge.ts, narrow the keyword down
 * from the Master's answers, guess, chat a little and vote.
 */

import type { Question, Role } from '../../shared/types';
import { answerMatches } from '../../shared/engine';
import { ALL_WORDS } from '../../shared/words';
import { PREDICATES, PREDICATE_BY_ID, type Predicate } from '../../shared/knowledge';

/** How often a human Master is assumed to answer loosely. */
const EPS = 0.12;

/** The public Q&A, plus which questions were asked from the predicate list. */
export interface QAView {
  questions: Question[];
  predicateOf: Map<number, string>;
}

/** Probability of each keyword given every answer so far (bot questions and wrong guesses). */
export function belief(view: QAView): Map<string, number> {
  const w = new Map(ALL_WORDS.map((x) => [x, 1]));
  for (const q of view.questions) {
    if (q.kind === 'guess') {
      if (q.answer === 'no') for (const word of ALL_WORDS) if (answerMatches(word, q.text)) w.set(word, 0);
      continue;
    }
    const pid = view.predicateOf.get(q.id);
    if (!pid || (q.answer !== 'yes' && q.answer !== 'no')) continue;
    const p = PREDICATE_BY_ID.get(pid);
    if (!p) continue;
    for (const [word, v] of w) {
      const agrees = (q.answer === 'yes') === p.yes.has(word);
      w.set(word, v * (agrees ? 1 - EPS : EPS));
    }
  }
  let total = 0;
  for (const v of w.values()) total += v;
  if (total > 0) for (const [k, v] of w) w.set(k, v / total);
  return w;
}

function entropy(p: number): number {
  if (p <= 0 || p >= 1) return 0;
  return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
}

/** Chance that the Master says "Có", given what the bot believes. */
function massOf(pred: Predicate, probs: Map<string, number>): number {
  let m = 0;
  for (const w of pred.yes) m += probs.get(w) ?? 0;
  return m;
}

function pickWeighted<T>(items: { item: T; weight: number }[], rng: () => number): T | undefined {
  const total = items.reduce((s, x) => s + x.weight, 0);
  if (total <= 0) return items[0]?.item;
  let r = rng() * total;
  for (const x of items) {
    r -= x.weight;
    if (r <= 0) return x.item;
  }
  return items[items.length - 1]?.item;
}

export type QADecision = { kind: 'ask'; text: string; predicateId: string } | { kind: 'guess'; text: string } | null;

export interface QAContext {
  view: QAView;
  role: Role;
  /** the Insider bot knows it */
  word?: string;
  /** 0 at the start of the Q&A, 1 when the sand runs out */
  elapsed: number;
  rng: () => number;
}

export function decideQA({ view, role, word, elapsed, rng }: QAContext): QADecision {
  const asked = new Set(view.predicateOf.values());
  const fresh = PREDICATES.filter((p) => !asked.has(p.id));

  if (role === 'insider' && word) {
    // Late in the round the Insider says it themselves rather than let everybody lose.
    if (elapsed > 0.8 && rng() < 0.55) return { kind: 'guess', text: word };
    const probs = belief(view);
    const scored = fresh.map((p) => ({ item: p, weight: entropy(massOf(p, probs)) + 0.02 }));
    // Mostly questions that steer toward the answer; now and then a red herring.
    const leading = scored.filter((s) => s.item.yes.has(word));
    const pool = rng() < 0.78 && leading.length ? leading : scored;
    const p = pickWeighted(pool, rng);
    if (p) return { kind: 'ask', text: p.text, predicateId: p.id };
    return elapsed > 0.5 ? { kind: 'guess', text: word } : null;
  }

  const probs = belief(view);
  const ranked = [...probs.entries()].filter(([, p]) => p > 0).sort((a, b) => b[1] - a[1]);
  const [top, pTop] = ranked[0] ?? ['', 0];
  const guessTop = (n: number) => ({
    kind: 'guess' as const,
    text: pickWeighted(
      ranked.slice(0, n).map(([w, p]) => ({ item: w, weight: p })),
      rng,
    )!,
  });

  if (pTop >= 0.33) return { kind: 'guess', text: top };
  if (pTop >= 0.12 && rng() < 0.3 + elapsed * 0.5) return guessTop(3);

  const best = fresh
    .map((p) => ({ item: p, weight: entropy(massOf(p, probs)) }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);
  if (!best.length || best[0].weight < 0.15) return ranked.length ? guessTop(5) : null;
  const p = pickWeighted(best, rng)!;
  return { kind: 'ask', text: p.text, predicateId: p.id };
}

/* ----------------------------------------------------------------- voting */

export interface VoteContext {
  questions: Question[];
  guesserId?: string;
  /** how much of the hourglass the Q&A used, 0–1 */
  qaUsed: number;
  rng: () => number;
}

/**
 * How much a player looks like they knew the answer: questions that keep
 * getting "Có" (the Insider steers; honest players probe both ways), and a
 * suspiciously quick find.
 */
export function suspicion(id: string, ctx: VoteContext): number {
  const asks = ctx.questions.filter((q) => q.playerId === id && q.kind === 'ask' && q.answer !== null);
  const yes = asks.filter((q) => q.answer === 'yes').length;
  let s = (yes + 1) / (asks.length + 2);
  if (id === ctx.guesserId && ctx.qaUsed < 0.25) s += 0.1;
  return s;
}

function mostSuspicious(ids: string[], ctx: VoteContext, noise: number): string | undefined {
  let best: string | undefined;
  let bestScore = -Infinity;
  for (const id of ids) {
    const s = suspicion(id, ctx) + (ctx.rng() - 0.5) * noise;
    if (s > bestScore) {
      best = id;
      bestScore = s;
    }
  }
  return best;
}

/**
 * Vote 1: true = "the guesser is the Insider". A Common convicts when the
 * guesser looks the most suspicious of everyone who could be the Insider.
 */
export function voteOnGuesser(selfId: string, role: Role, suspects: string[], ctx: VoteContext): boolean {
  // An Insider who was not the guesser wins if an innocent guesser is convicted.
  if (role === 'insider') return ctx.rng() < 0.75;
  const g = ctx.guesserId ?? '';
  const top = mostSuspicious(
    suspects.filter((id) => id !== selfId),
    ctx,
    0.12,
  );
  return top === g && suspicion(g, ctx) > 0.6;
}

/** Vote 2: point at someone else among the candidates. */
export function pointAt(selfId: string, candidates: string[], ctx: VoteContext): string | undefined {
  const pool = candidates.filter((id) => id !== selfId);
  return mostSuspicious(pool, ctx, 0.15);
}

/* ------------------------------------------------------------- small talk */

export function discussLine(
  selfId: string,
  role: Role,
  names: Map<string, string>,
  candidates: string[],
  ctx: VoteContext,
): string | null {
  const r = ctx.rng;
  if (r() < 0.3) return null;
  const pick = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  if (selfId === ctx.guesserId) {
    return pick([
      'Mình đoán trúng thôi mà, không phải Nội gián đâu!',
      'Tin mình đi, mình là Thường dân thật 😅',
      'Câu trả lời cứ dẫn mình tới đó, may mắn thôi.',
    ]);
  }
  const other = mostSuspicious(
    candidates.filter((id) => id !== selfId),
    ctx,
    role === 'insider' ? 0.1 : 0.3,
  );
  const name = other ? names.get(other) : undefined;
  if (!name) return pick(['Hmm… để mình nghĩ đã.', 'Ai hỏi câu đầu tiên nhỉ?']);
  return pick([
    `${name} hỏi trúng trọng tâm quá, hơi đáng ngờ đấy.`,
    `Mình để ý ${name} dẫn hướng khá khéo…`,
    `${name} có vẻ biết trước đáp án.`,
    `Mình nghi ${name}.`,
    'Hmm… để mình xem lại mấy câu hỏi.',
  ]);
}
