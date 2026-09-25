/**
 * Rules checks, then a few hundred rounds on a fake clock: bots ask and
 * guess, a scripted Master answers, humans vote. Invariants are checked
 * every tick — above all that no snapshot leaks the keyword or the Insider.
 * Run with `npm test`.
 */

import {
  ALIASES,
  afterVote1,
  answerMatches,
  discussionMs,
  drawKeyword,
  judgeGuesser,
  mentionsKeyword,
  newDeck,
  pickMaster,
  tally,
  topOf,
  vote2Candidates,
  winnersFor,
} from '../../shared/engine';
import { DISCUSS_MIN_MS, REVEAL, VOTE_MS, VOTE_REVEAL_MS, TIEBREAK_MS } from '../../shared/timing';
import { ALL_WORDS, CARDS } from '../../shared/words';
import type { Phase } from '../../shared/types';
import { Room } from '../src/room';
import { PREDICATE_BY_ID, PREDICATES, unknownWords } from '../src/knowledge';

let checks = 0;
let failures = 0;

function ok(cond: unknown, msg: string): void {
  checks++;
  if (!cond) {
    failures++;
    console.error('✗', msg);
  }
}

function eq<T>(a: T, b: T, msg: string): void {
  ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* -------------------------------------------------------------- word bank */
{
  eq(CARDS.length, 42, 'card count');
  eq(new Set(ALL_WORDS).size, 252, 'distinct words');
  for (let n = 1; n <= 6; n++) eq(CARDS.filter((c) => c.back === n).length, 7, `back number ${n} appears 7 times`);
  eq(unknownWords(), [], 'bot knowledge covers every keyword, spelled as printed');
  for (const w of Object.keys(ALIASES)) ok(ALL_WORDS.includes(w), `alias key is a keyword: ${w}`);
  for (const p of PREDICATES) {
    for (const w of p.yes) ok(ALL_WORDS.includes(w), `predicate ${p.id} names a keyword: ${w}`);
    ok(p.yes.size > 0 && p.yes.size < 252, `predicate ${p.id} splits the bank`);
  }
}

/* ---------------------------------------------------------------- answers */
{
  ok(answerMatches('Con mèo', 'mèo'), 'classifier dropped from the keyword');
  ok(answerMatches('Con mèo', 'con meo'), 'accents optional');
  ok(answerMatches('Con mèo', 'Có phải là con mèo không?'), 'the question around a guess');
  ok(answerMatches('Quả táo', 'trái táo'), 'quả/trái');
  ok(!answerMatches('Con mèo', 'chó'), 'a different animal');
  ok(answerMatches('La bàn', 'la bàn'), '"la" is not stripped from La bàn');
  ok(!answerMatches('La bàn', 'bàn'), 'half a keyword is not it');
  ok(answerMatches('Cờ vua', 'cờ vua') && !answerMatches('Cờ vua', 'vua'), 'Cờ vua');
  ok(answerMatches('Ti vi', 'TV'), 'alias');
  ok(answerMatches('Bóng đá', 'đá banh'), 'southern alias');
  ok(!answerMatches('Kìm', 'kem'), 'kem is not kìm');
  ok(!answerMatches('Bảng đen', 'băng'), 'no loose aliases');
  for (const w of ALL_WORDS) ok(answerMatches(w, w.toLowerCase()), `keyword matches itself: ${w}`);
  // Guessing one keyword must never count as another.
  const collisions: string[] = [];
  for (const a of ALL_WORDS) for (const b of ALL_WORDS) if (a !== b && answerMatches(a, b)) collisions.push(`${b} → ${a}`);
  eq(collisions, [], 'no keyword is accepted for another');

  ok(mentionsKeyword('Con mèo', 'Có phải con mèo không?'), 'mention with classifier');
  ok(mentionsKeyword('Con mèo', 'mèo à'), 'mention without classifier');
  ok(!mentionsKeyword('Gió', 'mấy giờ rồi'), 'accents matter for mentions');
  ok(!mentionsKeyword('Kem', 'kèm theo'), 'whole words only');
}

/* ----------------------------------------------------------------- rules */
{
  const rng = mulberry32(1);
  eq(pickMaster(['a', 'b', 'c'], 'a', 'rotate', rng), 'b', 'master rotates');
  eq(pickMaster(['a', 'b', 'c'], 'c', 'rotate', rng), 'a', 'master wraps round');
  eq(pickMaster([], undefined, 'rotate', rng), undefined, 'no humans, no master');

  eq(judgeGuesser({ a: true, b: false }).convicted, false, 'a tie is not a majority');
  eq(judgeGuesser({ a: true, b: true, c: false }).convicted, true, 'majority convicts');
  eq(judgeGuesser({}).convicted, false, 'no votes, no conviction');

  eq(afterVote1(true, true), 'commons', 'convicted Insider');
  eq(afterVote1(true, false), 'insider', 'convicted Common');
  eq(afterVote1(false, true), 'insider', 'acquitted Insider');
  eq(afterVote1(false, false), null, 'acquitted Common → vote 2');

  eq(vote2Candidates(['m', 'g', 'a', 'b'], 'm', 'g'), ['a', 'b'], 'vote 2 skips Master and guesser');
  eq(topOf(tally({ m: 'a', g: 'b', a: 'b', b: 'a' }, ['a', 'b'])), ['a', 'b'], 'tie');
  eq(topOf(tally({ m: 'a', g: 'a', b: 'a', a: 'b' }, ['a', 'b'])), ['a'], 'clear winner');
  eq(topOf(tally({}, ['a', 'b'])), ['a', 'b'], 'nobody voted: all tied');

  const roles = { m: 'master', i: 'insider', c: 'common' } as const;
  eq(winnersFor('commons', roles), ['m', 'c'], 'commons side');
  eq(winnersFor('insider', roles), ['i'], 'insider side');
  eq(winnersFor('none', roles), [], 'everyone loses');

  eq(discussionMs(90_000, 300_000), 90_000, 'flipped hourglass runs as long as the Q&A');
  eq(discussionMs(5_000, 300_000), DISCUSS_MIN_MS, 'discussion has a floor');

  const deck = newDeck(rng);
  const used = new Set<string>();
  const seen = new Set<string>();
  for (let i = 0; i < 252; i++) {
    const k = drawKeyword(deck, used, rng);
    const card = CARDS.find((c) => c.id === k.cardId)!;
    eq(card.words[k.row - 1], k.word, 'the keyword is on its card at its row');
    seen.add(k.word);
  }
  ok(seen.size >= 245, `a table sees (almost) every word before repeats: ${seen.size}`);
}

/* ------------------------------------------------------------- the table */

function table(seed: number, bots: number, humans = 1) {
  let t = 1_000_000;
  const clock = { now: () => t, advance: (ms: number) => (t += ms) };
  const room = new Room('TEST', { now: clock.now, rng: mulberry32(seed) });
  for (let h = 0; h < humans; h++) room.addPlayer({ id: `h${h}`, name: `Người ${h}`, avatar: h, socketId: `s${h}` });
  for (let b = 0; b < bots; b++) room.addPlayer({ id: `b${b}`, name: `Bot ${b}`, avatar: humans + b, isBot: true });
  return { room, clock };
}

/** Skip the reveal. */
function toQA(room: Room, clock: { advance: (ms: number) => void }) {
  clock.advance(REVEAL.total);
  room.tick();
}

{
  const { room, clock } = table(3, 4);
  eq(room.startRound('b0'), 'Chỉ chủ bàn mới bắt đầu được', 'only the host deals');
  eq(room.startRound('h0'), null, 'deal');
  const r = room.round!;
  eq(r.masterId, 'h0', 'a bot never gets the Master tile');
  eq(room.phase, 'reveal', 'reveal first');
  eq(room.privateState('h0').word, r.word, 'the Master sees the keyword');
  eq(room.privateState(r.insiderId).word, r.word, 'the Insider sees the keyword');
  const common = r.ids.find((id) => r.roles[id] === 'common')!;
  eq(room.privateState(common).word, null, 'a Common does not');
  ok(!JSON.stringify(room.publicState()).includes(r.word), 'the keyword is not public');

  ok(room.ask('b0', 'Có ăn được không?') !== null, 'no questions before the hourglass');
  toQA(room, clock);
  eq(room.phase, 'qa', 'hourglass running');
  ok(room.ask('h0', 'hỏi gì đây?') !== null, 'the Master does not ask');
  const said = room.addChat('h0', `đáp án là ${r.word} nhé`);
  ok(said && 'error' in said, 'the Master cannot say it in chat');

  const wrong = ALL_WORDS.find((w) => w !== r.word && !answerMatches(r.word, w))!;
  eq(room.guess(common, wrong), null, 'a wrong guess');
  eq(room.round!.questions.at(-1)!.answer, 'no', 'wrong guesses are answered by the table');
  ok(room.guess(common, r.word)?.startsWith('Chờ'), 'guess cooldown');
  clock.advance(3000);
  eq(room.guess(r.ids.find((id) => id !== common && id !== 'h0')!, wrong), 'Từ này đã có người đoán rồi', 'no repeat guesses');
  clock.advance(60_000);
  eq(room.guess(common, `có phải ${r.word.toLowerCase()} không`), null, 'right guess');
  eq(room.phase, 'discussion', 'hourglass flipped');
  eq(room.round!.guesserId, common, 'guesser recorded');
  eq(room.deadline! - clock.now(), 63_000, 'discussion lasts as long as the Q&A took');
  eq(room.publicState().word, r.word, 'the keyword is public once found');
}

{
  // The Master can accept a question as the answer (synonyms, "is it a …?").
  const { room, clock } = table(5, 4);
  room.startRound('h0');
  toQA(room, clock);
  const r = room.round!;
  const asker = r.ids.find((id) => id !== 'h0')!;
  room.ask(asker, 'Nó có phải thứ bạn nghĩ không?');
  const q = r.questions.at(-1)!;
  eq(room.answer(asker, q.id, 'yes'), 'Chỉ Quản trò mới trả lời', 'only the Master answers');
  eq(room.answer('h0', q.id, 'correct'), null, 'Master: that is it');
  eq(room.phase, 'discussion', 'found by the Master');
  eq(room.round!.guesserId, asker, 'the asker found it');
}

/** Plays a round from the Q&A to the end with humans h0 (Master) and h1. */
function scripted(opts: { guesserIsInsider: boolean; convict: boolean; vote2?: 'insider' | 'tie' }) {
  const { room, clock } = table(11, 4, 2);
  room.startRound('h0');
  const r = room.round!;
  // Put the roles where the scenario wants them.
  const others = r.ids.filter((id) => id !== 'h0');
  const insider = opts.guesserIsInsider ? 'h1' : 'b0';
  for (const id of others) r.roles[id] = id === insider ? 'insider' : 'common';
  r.insiderId = insider;
  toQA(room, clock);
  clock.advance(1000);
  room.guess('h1', r.word);
  eq(room.phase, 'discussion', 'found');
  for (const id of r.ids) room.setReady(id, true);
  room.tick();
  eq(room.phase, 'vote1', 'all ready → vote 1');
  ok(room.castVote1('h1', true) !== null, 'the guesser does not vote on themselves');
  for (const id of r.ids) if (id !== 'h1') room.castVote1(id, opts.convict);
  room.tick();
  eq(room.round!.vote1?.convicted, opts.convict, 'vote 1 result');
  eq(room.publicState().players.find((p) => p.id === 'h1')!.role, r.roles.h1, 'the guesser shows their tile');
  clock.advance(VOTE_REVEAL_MS);
  room.tick();
  if (room.phase === 'vote2') {
    const cands = room.round!.candidates;
    eq(cands.includes('h0') || cands.includes('h1'), false, 'no Master or guesser in vote 2');
    ok(room.castVote2('b1', 'b1') !== null, 'no pointing at yourself');
    if (opts.vote2 === 'insider') for (const id of r.ids) room.castVote2(id, id === 'b0' ? 'b1' : 'b0');
    else {
      // Split the table evenly between b0 and b1.
      room.castVote2('h0', 'b0');
      room.castVote2('h1', 'b1');
      room.castVote2('b0', 'b1');
      room.castVote2('b1', 'b0');
      room.castVote2('b2', 'b3');
      room.castVote2('b3', 'b2');
    }
    room.tick();
    clock.advance(VOTE_REVEAL_MS);
    room.tick();
    if (opts.vote2 === 'tie') {
      eq(room.phase, 'tiebreak', 'tie → the guesser decides');
      ok(room.breakTie('h0', 'b0') !== null, 'only the guesser breaks the tie');
      eq(room.breakTie('h1', 'b0'), null, 'guesser picks');
    }
  }
  return room;
}

{
  const room = scripted({ guesserIsInsider: true, convict: true });
  eq(room.round!.result?.winner, 'commons', 'Insider caught in vote 1');
  eq(room.find('h0')!.wins, 1, 'the Master wins with the Commons');
}
{
  const room = scripted({ guesserIsInsider: false, convict: true });
  eq(room.round!.result?.winner, 'insider', 'innocent guesser convicted');
  eq(room.round!.result?.accusedId, 'h1', 'accused recorded');
}
{
  const room = scripted({ guesserIsInsider: true, convict: false });
  eq(room.round!.result?.winner, 'insider', 'Insider guesser believed');
}
{
  const room = scripted({ guesserIsInsider: false, convict: false, vote2: 'insider' });
  eq(room.round!.result?.winner, 'commons', 'vote 2 found the Insider');
  eq(room.round!.result?.reason, 'vote2', 'reason vote 2');
}
{
  const room = scripted({ guesserIsInsider: false, convict: false, vote2: 'tie' });
  eq(room.round!.result?.winner, 'commons', 'tie broken toward the Insider');
}

{
  // Time runs out: everyone loses, the Master rotates, and a newcomer sits in next round.
  const { room, clock } = table(8, 3, 2);
  room.startRound('h0');
  // A human Insider who keeps quiet, and a keyword no bot can hit by luck.
  const r = room.round!;
  for (const id of r.ids) if (id !== 'h0') r.roles[id] = id === 'h1' ? 'insider' : 'common';
  r.insiderId = 'h1';
  r.word = 'không-có-trong-bộ';
  toQA(room, clock);
  clock.advance(room.settings.qaSeconds * 1000);
  room.tick();
  eq(room.phase, 'result', 'hourglass ran out');
  eq(room.round!.result?.winner, 'none', 'everybody loses');
  ok(room.players.every((p) => p.wins === 0), 'nobody scores');
  const newcomer = room.addPlayer({ id: 'h9', name: 'Mới', avatar: 7, socketId: 's9' });
  ok(newcomer, 'join between rounds');
  eq(room.publicState().players.find((p) => p.id === 'h9')!.inRound, false, 'newcomer waits');
  eq(room.startRound('h0'), null, 'next round');
  eq(room.round!.masterId, 'h1', 'the Master tile moves on');
  ok(room.round!.ids.includes('h9'), 'newcomer plays');
}

/* ------------------------------------------------------ bot-driven rounds */

const phaseOrder: Phase[] = ['reveal', 'qa', 'discussion', 'vote1', 'vote2', 'tiebreak', 'result'];
let rounds = 0;
let found = 0;
let botFound = 0;
let insiderFound = 0;
let findMs = 0;
const reasons: Record<string, number> = {};
const winners: Record<string, number> = {};

for (let seed = 1; seed <= 240; seed++) {
  const rng = mulberry32(seed * 7919);
  const humans = 1 + (seed % 2);
  const bots = 3 + (seed % 5);
  const { room, clock } = table(seed, Math.min(bots, 8 - humans), humans);
  if (seed % 3 === 0) room.setSettings('h0', { qaSeconds: 180 });
  eq(room.startRound('h0'), null, `deal (seed ${seed})`);
  const r = room.round!;
  let last = phaseOrder.indexOf(room.phase);
  let steps = 0;
  const limit = (room.settings.qaSeconds * 2000 + 3 * VOTE_MS + TIEBREAK_MS + 60_000) / 200;

  while (room.phase !== 'result' && steps++ < limit) {
    clock.advance(200);
    room.tick();

    // The Master answers bot questions truthfully (mostly), a few seconds late.
    if (room.phase === 'qa' && steps % 10 === 0) {
      for (const q of r.questions) {
        if (q.answer !== null || clock.now() - q.at < 1500) continue;
        const pid = r.predicateOf.get(q.id);
        const p = pid ? PREDICATE_BY_ID.get(pid) : undefined;
        const truth = p ? p.yes.has(r.word) : undefined;
        const answer = truth === undefined ? 'unknown' : rng() < 0.08 ? (truth ? 'no' : 'yes') : truth ? 'yes' : 'no';
        room.answer(r.masterId, q.id, answer);
      }
    }
    // The humans take part in the votes.
    for (const h of r.ids.filter((id) => !id.startsWith('b'))) {
      if (room.phase === 'discussion' && rng() < 0.05) room.setReady(h, true);
      if (room.phase === 'vote1' && h !== r.guesserId && rng() < 0.05) room.castVote1(h, rng() < 0.5);
      if (room.phase === 'vote2' && rng() < 0.05) {
        const pool = r.candidates.filter((id) => id !== h);
        room.castVote2(h, pool[Math.floor(rng() * pool.length)]);
      }
      if (room.phase === 'tiebreak' && h === r.guesserId && rng() < 0.1) room.breakTie(h, r.tiedIds![0]);
    }

    const now = phaseOrder.indexOf(room.phase);
    ok(now >= last, `phases only move forward (seed ${seed}: ${phaseOrder[last]} → ${room.phase})`);
    last = now;

    const pub = room.publicState();
    const json = JSON.stringify(pub);
    if (pub.phase === 'reveal' || pub.phase === 'qa') ok(!pub.word && !json.includes(`"${r.word}"`), `keyword hidden (seed ${seed})`);
    if (pub.phase !== 'result' && !(pub.phase === 'vote1' && r.vote1)) {
      ok(!json.includes('"insider"'), `Insider hidden in ${pub.phase} (seed ${seed})`);
    }
    for (const id of r.ids) {
      const priv = room.privateState(id);
      ok(!!priv.word === (r.roles[id] !== 'common'), `only the Master and Insider know the word (seed ${seed})`);
    }
  }

  ok(room.phase === 'result', `round ends (seed ${seed}, stuck in ${room.phase})`);
  const res = r.result!;
  rounds++;
  reasons[res.reason] = (reasons[res.reason] ?? 0) + 1;
  winners[res.winner] = (winners[res.winner] ?? 0) + 1;
  if (res.reason !== 'timeout') {
    found++;
    findMs += r.qaElapsed ?? 0;
    if (res.guesserId === res.insiderId) insiderFound++;
    if (res.guesserId?.startsWith('b')) botFound++;
  }
  ok(!res.winners.includes(res.insiderId) || res.winner === 'insider', `winners consistent (seed ${seed})`);
  if (res.winner === 'commons') ok(res.winners.includes(res.masterId), 'the Master wins with the Commons');
  ok(room.players.reduce((s, p) => s + p.wins, 0) === res.winners.length, 'wins counted once');
}

const pct = (n: number) => `${Math.round((100 * n) / rounds)}%`;
console.log(
  `rounds: ${rounds}, keyword found ${pct(found)} (by bots ${pct(botFound)}, by the Insider ${pct(insiderFound)}) after ${Math.round(findMs / found / 1000)}s on average`,
);
console.log('reasons:', reasons, 'winners:', winners);
ok(found / rounds > 0.6, 'bots find the keyword in most rounds with a truthful Master');

console.log(`${checks - failures}/${checks} checks passed`);
if (failures) process.exit(1);
