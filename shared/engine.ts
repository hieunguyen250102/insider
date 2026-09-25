/**
 * The rules as pure functions — no I/O, no clocks. The server uses them to
 * referee; the client imports the same constants so both sides agree.
 */

import type { Role, Settings, Winner } from './types';
import { CARDS } from './words';
import { DEFAULT_QA_SECONDS, DISCUSS_MIN_MS } from './timing';

/** The box has 8 role tiles: 1 Master, 1 Insider, 6 Commons. */
export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 8;
export const AVATAR_COUNT = 8;

export const DEFAULT_SETTINGS: Settings = { qaSeconds: DEFAULT_QA_SECONDS, masterMode: 'rotate' };

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ------------------------------------------------------------------ roles */

/**
 * The Master tile among people: the next one round the table after the last
 * Master, or anyone. (In 'bot' mode the room hands it to a bot instead.)
 */
export function pickMaster(
  humanIds: string[],
  prevMasterId: string | undefined,
  mode: Settings['masterMode'],
  rng: () => number,
): string | undefined {
  if (!humanIds.length) return undefined;
  const prev = prevMasterId ? humanIds.indexOf(prevMasterId) : -1;
  if (mode === 'random' || !prevMasterId) return humanIds[Math.floor(rng() * humanIds.length)];
  return humanIds[(prev + 1) % humanIds.length];
}

/** One Insider among everyone but the Master; the rest are Commons. */
export function dealRoles(ids: string[], masterId: string, rng: () => number): Record<string, Role> {
  const others = ids.filter((id) => id !== masterId);
  const insiderId = others[Math.floor(rng() * others.length)];
  const roles: Record<string, Role> = {};
  for (const id of ids) roles[id] = id === masterId ? 'master' : id === insiderId ? 'insider' : 'common';
  return roles;
}

export function insiderOf(roles: Record<string, Role>): string {
  return Object.keys(roles).find((id) => roles[id] === 'insider') ?? '';
}

/* ---------------------------------------------------------------- keyword */

/** The keyword deck, face down, as card ids. */
export function newDeck(rng: () => number): string[] {
  return shuffle(
    CARDS.map((c) => c.id),
    rng,
  );
}

/**
 * As on the table: turn over the top card; the number on the back of the
 * next card picks the row. The used card goes to the bottom of the deck,
 * and a full lap reshuffles it. Words this table has already played are
 * skipped until the bank runs dry.
 */
export function drawKeyword(
  deck: string[],
  used: Set<string>,
  rng: () => number,
): { cardId: string; row: number; word: string } {
  if (used.size >= CARDS.length * 6) used.clear();
  let pick = { cardId: deck[0], row: 1, word: '' };
  for (let tries = 0; tries < 300; tries++) {
    if (tries && tries % deck.length === 0) deck.splice(0, deck.length, ...shuffle(deck, rng));
    const cardId = deck.shift()!;
    deck.push(cardId);
    const card = CARDS.find((c) => c.id === cardId)!;
    const row = CARDS.find((c) => c.id === deck[0])!.back;
    pick = { cardId, row, word: card.words[row - 1] };
    if (!used.has(pick.word)) break;
  }
  used.add(pick.word);
  return pick;
}

/* ---------------------------------------------------------------- answers */

/** Other names people really use for a keyword, spelled with their accents. */
export const ALIASES: Record<string, string[]> = {
  'Ti vi': ['tivi', 'TV', 'truyền hình'],
  'Ô tô': ['xe hơi', 'oto', 'xe ô tô'],
  'Máy bay': ['phi cơ'],
  'Tàu hỏa': ['xe lửa', 'tàu lửa'],
  'Xe buýt': ['xe bus', 'bus', 'xe buyt'],
  'Xe máy': ['xe gắn máy', 'xe mô tô'],
  'Điện thoại': ['điện thoại di động', 'smartphone'],
  'Máy tính xách tay': ['laptop', 'máy tính', 'máy vi tính'],
  'Tai nghe': ['headphone'],
  'Máy ảnh': ['máy chụp hình', 'máy chụp ảnh', 'camera'],
  'Bỏng ngô': ['bắp rang', 'bắp rang bơ', 'popcorn'],
  'Quả dứa': ['trái thơm', 'quả thơm', 'trái khóm'],
  'Dưa chuột': ['dưa leo'],
  'Bí đỏ': ['bí ngô'],
  'Sô cô la': ['socola', 'chocolate', 'sôcôla'],
  'Kem': ['cà rem', 'kem que'],
  'Kẹo bông': ['kẹo bông gòn'],
  'Sữa chua': ['da ua', 'yaourt', 'yogurt'],
  'Cà phê': ['cafe', 'coffee', 'cà fê'],
  'Bươm bướm': ['con bướm'],
  'Cú mèo': ['con cú'],
  'Chim cánh cụt': ['cánh cụt'],
  'Chim công': ['con công'],
  'Chim gõ kiến': ['gõ kiến'],
  'Rùa biển': ['con rùa'],
  'Nàng tiên cá': ['tiên cá'],
  'Đàn piano': ['piano', 'dương cầm'],
  'Đàn ghi ta': ['guitar', 'ghita', 'đàn guitar'],
  'Đàn vi ô lông': ['violin', 'vĩ cầm', 'đàn violin'],
  'Kèn trumpet': ['kèn', 'trumpet'],
  'Sáo': ['ống sáo'],
  'Bóng đá': ['đá bóng', 'đá banh'],
  'Bóng bàn': ['ping pong'],
  'Bơi lội': ['bơi'],
  'Rạp chiếu phim': ['rạp phim', 'rạp chiếu bóng'],
  'Sân bay': ['phi trường'],
  'Bể bơi': ['hồ bơi'],
  'Sở thú': ['vườn thú', 'thảo cầm viên'],
  'Nhà hàng': ['quán ăn'],
  'Bảo tàng': ['viện bảo tàng'],
  'Bệnh viện': ['nhà thương'],
  'Nhà ga': ['ga tàu', 'ga xe lửa'],
  'Kính râm': ['kính mát'],
  'Mũ bảo hiểm': ['nón bảo hiểm'],
  'Khăn quàng cổ': ['khăn choàng', 'khăn quàng'],
  'Hoa tai': ['bông tai'],
  'Ví tiền': ['cái ví', 'bóp'],
  'Tua vít': ['tuốc nơ vít'],
  'Lều': ['lều trại'],
  'Chăn': ['mền'],
  'Rèm cửa': ['màn cửa', 'rèm'],
  'Cục tẩy': ['cục gôm', 'gôm'],
  'Vở học sinh': ['quyển vở', 'quyển tập'],
  'Cặp sách': ['cặp đi học'],
  'Bảng đen': ['bảng phấn'],
  'Bàn chải đánh răng': ['bàn chải'],
  'Gương soi': ['gương', 'kiếng'],
  'Máy sấy tóc': ['máy sấy'],
  'Ấm đun nước': ['ấm nước', 'ấm siêu tốc', 'ấm điện'],
  'Giường ngủ': ['giường'],
  'Tủ quần áo': ['tủ đồ', 'tủ áo'],
  'Xà phòng': ['xà bông'],
  'Đũa': ['đôi đũa'],
  'Vịnh Hạ Long': ['Hạ Long'],
  'Hồ Gươm': ['hồ Hoàn Kiếm', 'Hoàn Kiếm'],
  'Tháp Eiffel': ['Eiffel', 'tháp Ép-phen'],
  'Tết Nguyên đán': ['Tết', 'Tết âm lịch'],
  'Tết Trung thu': ['Trung thu'],
  'Kỳ lân': ['unicorn'],
  'Ma cà rồng': ['vampire'],
  'Robot': ['rô bốt', 'người máy'],
  'Tên lửa': ['hỏa tiễn'],
  'Phi hành gia': ['nhà du hành vũ trụ', 'nhà du hành'],
  'Lính cứu hỏa': ['lính chữa cháy'],
  'Xe cứu hỏa': ['xe chữa cháy'],
  'Nhiếp ảnh gia': ['thợ chụp ảnh', 'thợ ảnh', 'thợ chụp hình'],
  'Lập trình viên': ['coder', 'lập trình'],
  'Tài xế': ['lái xe', 'tài xế'],
  'Thợ cắt tóc': ['thợ hớt tóc'],
  'Cơn bão': ['bão'],
  'Sấm sét': ['sấm', 'sét'],
  'Bông tuyết': ['tuyết'],
  'Sương mù': ['sương'],
  'Cầu vồng': ['cầu vòng'],
  'Hang động': ['hang'],
  'Thác nước': ['thác'],
  'Đảo': ['hòn đảo'],
  'Cây xương rồng': ['xương rồng'],
  'Hoa hướng dương': ['hướng dương'],
  'Rễ cây': ['rễ'],
  'Lá cây': ['lá'],
  'Hạt giống': ['hạt mầm'],
  'Đám cưới': ['lễ cưới', 'tiệc cưới'],
  'Sinh nhật': ['tiệc sinh nhật'],
  'Vẽ tranh': ['vẽ'],
  'Chụp ảnh': ['chụp hình'],
  'Rửa bát': ['rửa chén'],
  'Giặt quần áo': ['giặt đồ', 'giặt'],
  'Phong bì': ['bao thư'],
  'Con tem': ['tem'],
  'Hộ chiếu': ['passport'],
  'Vali': ['va li'],
  'Ổ khóa': ['khóa', 'cái khóa'],
  'Vòng tay': ['lắc tay'],
  'Dây chuyền': ['vòng cổ'],
  'Đồng hồ đeo tay': ['đồng hồ'],
  'Găng tay': ['bao tay'],
  'Bún bò': ['bún bò Huế'],
  'Ốc sên': ['ốc'],
};

/**
 * Words that often lead a noun ("con mèo", "quả táo"). A guess, and the
 * keyword, both match with or without one. Only words that never start a
 * keyword themselves — "người" would turn "Người tuyết" into "tuyết".
 */
const CLASSIFIERS = ['con', 'cái', 'chiếc', 'quả', 'trái', 'cây', 'đôi', 'củ', 'hòn', 'ngôi', 'tòa', 'bức', 'tấm', 'quyển', 'ông'];

/** Lowercase, drop accents and punctuation: "Hươu cao cổ!" → "huou cao co". */
export function foldText(s: string): string {
  return s
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Old and new tone placement ("hoà" / "hòa", "thuỷ" / "thủy") spelled one way. */
const TONE_PLACEMENT: [RegExp, string][] = [
  [/oà/g, 'òa'], [/oá/g, 'óa'], [/oả/g, 'ỏa'], [/oã/g, 'õa'], [/oạ/g, 'ọa'],
  [/oè/g, 'òe'], [/oé/g, 'óe'], [/oẻ/g, 'ỏe'], [/oẽ/g, 'õe'], [/oẹ/g, 'ọe'],
  [/uỳ/g, 'ùy'], [/uý/g, 'úy'], [/uỷ/g, 'ủy'], [/uỹ/g, 'ũy'], [/uỵ/g, 'ụy'],
];

/** Lowercase, keep accents, drop punctuation: "Hươu cao cổ!" → "hươu cao cổ". */
function toneText(s: string): string {
  let t = s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  for (const [re, to] of TONE_PLACEMENT) t = t.replace(re, to);
  return t;
}

/** Typed without a single accent: then accents cannot tell "chó" from "chợ" and both are fine. */
function isPlain(s: string): boolean {
  return !/[^\x00-\x7f]/.test(s.normalize('NFC'));
}

/** The question around a guess, as folded words: "có phải là … không?". */
const PREFIXES = [['co', 'phai', 'la'], ['co', 'phai'], ['phai', 'la'], ['la'], ['co']];
const SUFFIXES = [['phai', 'khong'], ['dung', 'khong'], ['khong'], ['a'], ['ha'], ['nhi'], ['nhe'], ['chang'], ['vay'], ['ak']];

function startsWith(words: string[], pattern: string[]): boolean {
  return pattern.length < words.length && pattern.every((p, i) => foldText(words[i]) === p);
}

function endsWith(words: string[], pattern: string[]): boolean {
  const off = words.length - pattern.length;
  return off > 0 && pattern.every((p, i) => foldText(words[off + i]) === p);
}

/**
 * Every reading of a guess, as word lists: as typed, and with the question
 * around it stripped. Stripping only ever adds readings, so "La bàn" still
 * reads as "la bàn" while "có phải là con mèo không" also reads as "con mèo".
 */
function readings(words: string[]): string[][] {
  let w = words;
  for (let i = 0; i < 3; i++) {
    const suffix = SUFFIXES.find((p) => endsWith(w, p));
    if (suffix) w = w.slice(0, w.length - suffix.length);
  }
  const out = [words, w];
  for (const p of PREFIXES) if (startsWith(w, p)) out.push(w.slice(p.length));
  return out;
}

/** A phrase joined up, with and without a leading classifier. */
function forms(words: string[], classifiers: Set<string>): string[] {
  if (!words.length) return [];
  const out = [words.join('')];
  if (words.length > 1 && classifiers.has(words[0])) out.push(words.slice(1).join(''));
  return out;
}

const TONED = new Set(CLASSIFIERS);
const FOLDED = new Set(CLASSIFIERS.map(foldText));

/** The spellings a guess and a keyword are compared in: with accents, unless the guess has none. */
function spellings(text: string, plain: boolean, question: boolean): Set<string> {
  const words = (plain ? foldText(text) : toneText(text)).split(' ').filter(Boolean);
  const all = question ? readings(words) : [words];
  return new Set(all.flatMap((w) => forms(w, plain ? FOLDED : TONED)));
}

/**
 * Forgiving about case, spacing, classifiers, "có phải là…" — and accents
 * when the guess has none — but strict about the word: "chợ" is not "chó".
 */
export function answerMatches(keyword: string, guess: string): boolean {
  const plain = isPlain(guess);
  const g = spellings(guess, plain, true);
  for (const name of [keyword, ...(ALIASES[keyword] ?? [])]) {
    for (const f of spellings(name, plain, false)) if (g.has(f)) return true;
  }
  return false;
}

/** Two guesses naming the same thing ("mèo" and "Con mèo" are one guess). */
export function sameGuess(a: string, b: string): boolean {
  const plain = isPlain(a) || isPlain(b);
  const fb = spellings(b, plain, true);
  return [...spellings(a, plain, true)].some((f) => fb.has(f));
}

/**
 * Whether a sentence names the keyword, with its accents (so "giờ" is not
 * "Gió"): used to hint the Master and to stop them saying it in chat.
 */
export function mentionsKeyword(keyword: string, text: string): boolean {
  const t = ` ${toneText(text)} `;
  const k = toneText(keyword).split(' ');
  const cores = [k.join(' ')];
  if (k.length > 1 && TONED.has(k[0])) cores.push(k.slice(1).join(' '));
  return cores.some((c) => t.includes(` ${c} `));
}

/* ------------------------------------------------------------- discussion */

/** The hourglass is turned over: it runs as long as the Q&A took. */
export function discussionMs(qaElapsedMs: number, qaMs: number): number {
  return Math.min(Math.max(qaElapsedMs, DISCUSS_MIN_MS), Math.max(qaMs, DISCUSS_MIN_MS));
}

/* ----------------------------------------------------------------- voting */

/** Vote 1. A tie is not a majority. */
export function judgeGuesser(votes: Record<string, boolean>): { yes: string[]; no: string[]; convicted: boolean } {
  const yes = Object.keys(votes).filter((id) => votes[id]);
  const no = Object.keys(votes).filter((id) => !votes[id]);
  return { yes, no, convicted: yes.length > no.length };
}

/**
 * The table after vote 1: who won, or null when the round goes on to vote 2
 * (the guesser was believed, and was telling the truth).
 */
export function afterVote1(convicted: boolean, guesserIsInsider: boolean): Winner | null {
  if (convicted) return guesserIsInsider ? 'commons' : 'insider';
  return guesserIsInsider ? 'insider' : null;
}

/** Vote 2 points at someone whose role is still secret: not the Master, not the guesser. */
export function vote2Candidates(ids: string[], masterId: string, guesserId: string | undefined): string[] {
  return ids.filter((id) => id !== masterId && id !== guesserId);
}

export function tally(votes: Record<string, string>, candidates: string[]): Record<string, number> {
  const t: Record<string, number> = {};
  for (const id of candidates) t[id] = 0;
  for (const target of Object.values(votes)) if (target in t) t[target] += 1;
  return t;
}

/** Everyone sharing the most votes. Nobody voting leaves all candidates tied. */
export function topOf(t: Record<string, number>): string[] {
  const ids = Object.keys(t);
  const max = Math.max(0, ...ids.map((id) => t[id]));
  return ids.filter((id) => t[id] === max);
}

export function winnersFor(winner: Winner, roles: Record<string, Role>): string[] {
  const ids = Object.keys(roles);
  if (winner === 'insider') return ids.filter((id) => roles[id] === 'insider');
  if (winner === 'commons') return ids.filter((id) => roles[id] !== 'insider');
  return [];
}
