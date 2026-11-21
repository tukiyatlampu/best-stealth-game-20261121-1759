# Shadow Ledger — a stealth game

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/tukiyatlampu/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/tukiyatlampu/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

Night at the Meridian Archive. You are Wren, a courier-thief. Steal all 3 ledger
pages on each of 3 nights and reach the green EXIT unseen.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: `game/` is plain static files. Desktop Chrome.

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| SHIFT (hold) | Sneak — silent, harder to see, slower |
| CLICK | Throw a coin (3 per night) — the clink pulls a guard to investigate |
| P | Pause · M — Mute · R — Retry night · ENTER — Start / continue |

## How the stealth works

- Guards patrol fixed rounds with real vision cones. Walls, crates and tall
  shelves block their line of sight; shadow floors hide you, lamplight
  exposes you.
- Being seen fills a guard's suspicion: a `?` means they stopped to stare,
  a full meter means they chase. Break line of sight for 4s and they search
  your last seen spot, then return to patrol — a near-miss is recoverable.
- Walking is audible nearby (watch the noise ring); sneaking is silent.
  A guard's footsteps tick when he is close.
- Night 3 adds the warden: a longer, narrower cone and a faster chase.

## Files

- `game/index.html` + `game/src/` — the game, one job per file:
  `config.js` tuning, `levels.js` level data, `vision.js` line of sight,
  `guards.js` guard AI, `player.js` movement and coins, `audio.js`
  synthesized WebAudio effects, `render.js` all drawing, `input.js` keys
  and mouse, `shots.js` deterministic screenshot staging, `main.js` the
  loop and screens.
- `main.ts` — copies `game/` + `screenshots/` to `/output` and writes
  `dossier.json` (Node 22, stdlib only, deterministic).
- `screenshots/` — 4 real renders of the game code (`?shot=cover|patrol|
  alert|win`), 1280x800.

## Test

```sh
node --check game/src/main.js   # syntax, per module
MAKEFUN_OUTPUT_DIR=out node main.ts   # build the hand-in, twice, compare
```

See [TEST_RESULTS.md](TEST_RESULTS.md) for the recorded runs.
