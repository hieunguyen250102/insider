# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A realtime online version of Oink Games' **Insider**, titled **"Nội Gián"**, for 4–8 players with a Vietnamese UI. The layout, the auth and the deploy setup mirror the sibling project `../deepsea`, and the email login comes from the shared `oink-kit` package. The source of truth for the rules is `Insider_Condensed_Rules.pdf`; `pdftotext -layout Insider_Condensed_Rules.pdf -` extracts it. Its "Advanced Variant" (there may be no Insider) is not implemented.

`images/` is a separate, older deliverable: a printable DIY card kit that `images/05_du_lieu/build_insider.py` generates (see "The print kit" below). The online game does not load those PNGs. Every piece is redrawn as SVG in `client/src/components/art/`. The only link between the two is the word list.

## Commands

```bash
npm install && npm run install:all   # root + server + client deps
npm run dev                          # server :4200 + client :5190 (ports differ from the other Oink games)
npm test                             # server/test/sim.ts: rules checks + 240 bot rounds on a fake clock
npm run typecheck                    # tsc for server and client
npm run build                        # tsup server → server/dist, vite client → client/dist
```

There is no test framework. `server/test/sim.ts` is a plain script using `ok`/`eq` helpers, run by `tsx`, and it exits non-zero on any failure. To test one rule, add a `{ ... }` block there. `table(seed, bots, humans)` builds a `Room` with an injected clock and rng. Tests may set `room.round.roles`, `insiderId` and `word` directly to force a scenario; `scripted()` shows how. The "no keyword is accepted for another" check compares every pair of the 252 words, so run it after touching `ALIASES` or the matching code.

Without mail config, the dev server prints login codes to its console and the client shows the code under the input. `HOST_EMAILS` empty means anyone can create a table. Two logins in one browser need two origins, e.g. `localhost:5190` and `127.0.0.1:5190`.

## Architecture

- **`shared/`** holds the pure rules, imported by the server by relative path and by the client through the `@shared` alias.
  - `engine.ts`: dealing roles, drawing keywords, matching guesses, vote tallies.
  - `types.ts`: the wire types.
  - `timing.ts`: phase lengths. `REVEAL` is the fixed "eyes closed" script that `client/src/components/game/Night.tsx` plays against the server clock.
  - `words.ts`: the 42 cards × 6 words, generated from `images/05_du_lieu/insider_252_tu_khoa.json`.
  - `knowledge.ts`: the bots' word groups and yes/no predicates, plus the bot Master (`matchQuestion`, `masterAnswer`). It is shared so the client can offer the predicates as one-tap questions.
- **`server/src/room.ts`** (`Room`) is the whole state machine: `lobby → reveal → qa → discussion → vote1 → vote2 → tiebreak → result`. A failed Q&A jumps to `result`. Methods return an error string or `null`. Time passes only in `tick()`, which `index.ts` calls for every room every 200 ms. It handles deadlines, bots and host hand-off, and returns whether to broadcast. The clock and rng are constructor-injected, which is how the tests play rounds instantly.
- **Secrets.** `publicState()` must never contain the keyword before it is found, or the Insider before `result`. The only exception is the guesser's own role, which becomes public once vote 1 closes. `privateState(id)` goes to each socket separately: the Master and the Insider get `word` and `card`. `sim.ts` checks these rules on every tick of every round, so keep it passing whenever you touch snapshots.
- **Vote reveals** are a pause inside the same phase. Once everyone has voted, `vote1` (or `vote2`) becomes set and `deadline` moves to `VOTE_REVEAL_MS`. The client shows the raised hands until the next `tick()` moves on. Waiting only counts `active()` seats (bots plus connected people), so a dropped player never blocks the table.
- **Guess matching** (`answerMatches`) is accent-sensitive when the guess has any diacritics and folded when it has none, so "chợ" ≠ "Con chó" but "cho" matches both. It strips "có phải là … không" and leading classifiers (`con`, `quả`…), and accepts the `ALIASES` (written with accents). The Master can always stamp **Đúng rồi!** on any question or guess, and that also ends the Q&A.
- **Bots** (`bot.ts` + `shared/knowledge.ts`) hold the Master tile only when `masterMode` is `'bot'`, which lets a lone person play Common or Insider. A bot Master answers the oldest open question after a beat: listed predicates truthfully, a question naming the keyword with **Đúng rồi!**, one naming another keyword with "Không", a typed question through `KEYS` (`matchQuestion`), and anything else with "Không biết". `knowledge.ts` has the word list's 42 themed groups and yes/no **predicates** (question text plus the set of words a sensible Master answers "Có" for). Bots only learn from predicate questions (`round.predicateOf`: their own, listed ones a person taps, and typed ones a bot Master understood) and from wrong guesses; they ignore other human questions. `belief()` is a soft Bayes update with `EPS` for sloppy answers. Commons ask the question with the most information and guess when one word dominates. An Insider bot mostly asks leading questions and says the word itself late in the round. Voting uses `suspicion()`, the share of a player's questions answered "Có".
- **`server/src/index.ts`** maps socket events to `Room` methods through `act()`, then broadcasts: the public state, then `private` to each seat, then chat messages the room queued (`drainOutbox()`, for announcements and bot talk). Auth, CORS and `/health` come from `oink-kit/server`, the same as deepsea.

### Client

- `App.tsx` holds `state`, `priv` and `chat`, and `syncClock(state.now)` keeps countdowns on server time (`lib/clock.ts`). `GameScreen.tsx` picks the stage for each phase and plays the big moments: the gong and `FoundBanner` when the keyword is found, and tick-tock in the last 10 s.
- **Do not add framer `exit` animations or `AnimatePresence mode="wait"` to stages or overlays.** In a hidden tab the exit never completes, which left the stage blank and could leave a full-screen overlay (the night, the rules) covering the table. Elements only animate in: keyed `motion` elements with `initial`/`animate`. `FoundBanner` fades itself out and is unmounted on a timer. `Hourglass` also settles its turn on a timer for the same reason.
- `Hourglass` draws sand from `fraction` (the upper bulb's share). `turns` rotates the glass. During the discussion, the upper sand is the time the Q&A used, which is exactly how the physical game flips it.
- `QAFeed` stamps (and plays a sound for) only answers that change while it is mounted. The Master's keys 1–4 answer the oldest open question; a `sent` set stops quick presses from hitting the same question twice.
- Styling is Tailwind v4 with tokens in `client/src/index.css` `@theme`: `paper`, `ink`, `vermilion`, `mustard`, `teal`, `night`, and the `btn-*` classes. The design brief is the kit's screen-print look: cream paper, vermilion and charcoal on a dim room with a halftone texture. **No neon or glow effects.** Fonts are Oswald (display) and Be Vietnam Pro, both with Vietnamese glyphs.

## Deploy

The client goes to Vercel (`vercel.json`, env `VITE_SERVER_URL`). The server goes to Render (`render.yaml` blueprint, `/health`). `api/send-code.js` is the Vercel mail relay from `oink-kit`, because Render's free plan blocks SMTP. Room state is in memory, so a server restart drops all tables. That includes `tsx watch` reloads in dev, and editing anything in `shared/` triggers one. Sessions survive because tokens are signed with `SESSION_SECRET`. README.md has the env var table.

## The print kit (`images/`)

`images/05_du_lieu/build_insider.py` (Pillow plus DejaVu fonts) generates the printable PNG cards, the instruction pages, the box labels, the word JSON/CSV and `images/README.txt`. The hourglass PNG was AI-generated from `prompt_dong_ho_cat.txt`. The script's output root `R` on line 4 is hardcoded to an old scratch path, so point it at `images/` before running it. Words are shuffled with the fixed seed `9242026` into 42 cards; the back number is `i//7+1`. Changing any word reshuffles every card. If you do, regenerate the kit **and** `shared/words.ts` (from the JSON), and keep `shared/knowledge.ts` groups in step: the tests fail if a keyword is missing from them.
