# TEST_RESULTS — Shadow Ledger

Recorded from real runs on 2026-11-22 (WIB). Commands live in
`~/workspace/makefun-bounty/work/stealth/` (harness, not part of the entry).

## 1. Syntax — every game module parses

```sh
for f in game/src/*.js; do cp "$f" /tmp/chk.mjs && node --check /tmp/chk.mjs; done
```

Result: 10/10 OK — audio, config, guards, input, levels, main, player,
render, shots, vision. Node v24.22.1.

## 2. Headless logic tests — 17/17 PASS

```sh
node logic-test.mjs
```

- All 3 levels build (2 / 3 / 5 guards, 3 pages each; level 3 has 1 warden).
- LOS blocked by a crate; LOS open down a corridor.
- Guard sees the player in an open cone (exposure 0.62); blind behind it;
  sneaking lowers exposure (0.34 < 0.62).
- Suspicion ramps to ALERTED and the chase ends in a catch.
- Suspicion decays behind cover; alerted -> search -> return -> patrol.
- Coin throw lands in range, is rejected out of range, pulls a guard to
  investigate (state search).
- Walls block movement; floor allows it.

## 3. Browser play-test — 18/18 PASS

```sh
node playtest.mjs   # Playwright + Chromium, serves game/ on localhost
```

- Boots to the title screen with zero console/page errors.
- Enter starts the game; keyboard moves the player (x 112 -> 230).
- Sneak key tracked; guard suspicion rises to 1.00 in an open cone.
- Crate blocks line of sight (suspicion 0.00).
- Alerted guard catches the player (state caught); R retries the night.
- Walking over all 3 pages collects them; reaching the exit clears the
  level (state level-clear).
- Coin throw pulls a guard to investigate (state search).
- Level 3 loads 5 guards including the warden.
- 4 screenshots captured from staged scenes, each 1280x800 JPEG, 42-53 KiB.

## 4. Screenshots — real renders, viewed

- `1-cover.jpg` 47,816 B — thief sneaking behind crates, cone sweeping past.
- `2-patrol.jpg` 51,928 B — three guards, crossing cones, player in shadow.
- `3-alert.jpg` 53,286 B — warden red cone, SPOTTED!, another guard "?".
- `4-win.jpg` 47,998 B — CLEAN GETAWAY, 3/3 pages, ghost.

All 1280x800, each under the 256 KiB cap. No console errors while taking
them. Staging is deterministic (`?shot=cover|patrol|alert|win`, frozen
clock, fixed poses) so re-captures are identical.

## 5. Determinism — main.ts, two runs byte-identical

```sh
MAKEFUN_OUTPUT_DIR=/tmp/out1 node main.ts
MAKEFUN_OUTPUT_DIR=/tmp/out2 node main.ts
diff -r /tmp/out1 /tmp/out2   # no differences
```

dossier.json sha256:
`56ce001ecf504afb287be5accd596b3db5f958dff32b006e47889702df85a517`
(321,379 bytes at the final build; 12 source files, 56,620 bytes of game
source in the dossier text, under the 160 KiB cap).

## 6. Zero-fail QA — clean directory

Copied the package to a fresh directory and ran it there:

- 21 files, 0 symlinks in game/, no secrets found by grep scan.
- `main.ts` runs with `MAKEFUN_OUTPUT_DIR` and writes game/,
  screenshots/, dossier.json.
- `serve.ts` serves index.html and main.js with HTTP 200.
- LICENSE line 1: `SPDX-License-Identifier: MIT`.
- `.makefun/owner.json`: exactly 58 bytes.
- `vendor/makefun-game.ts` sha256 matches the kit manifest
  (`dc67187521b24025ff952f8c231485a6eb92d6d71d29edd2a08154ffb4376129`).
- No `http://` / `https://` references anywhere under game/.

## 7. 2-Pass Critique — SolAPI unavailable, local harsh pass applied

SolAPI chat (`POST /v1/responses`) returned HTTP 503 on every attempt
(2026-11-22 ~05:20, ~05:45, ~06:00 WIB; `GET /v1/models` still works and
lists `gpt-6.1-sol`). The gpt-6.1-sol judge pass could not run. A harsh
local critique was applied instead, with fixes verified by re-running
sections 2-4:

- HUD said "SUSPICIOUS…" for any faint suspicion — now only at >= 0.35
  (a guard actually staring); below that "NOTICED…".
- Win overlay dimmed the hall too much (0.78 -> 0.66 alpha) so the level
  still reads behind "CLEAN GETAWAY".
- Cover staging hid half the player behind crates — player moved one tile
  out so the thief reads fully at small size.
- Fixed a real input bug found by the play-test: quick key taps (R, Enter,
  P, M) could fall between frames and be lost; taps are now queued and
  consumed per frame (`Input.tappedKey`).
- Fixed a wrong line on the final level-clear screen ("next night" on the
  last night -> "claim the ledger").

Known gap: no gpt-6.1-sol judge score — retry the SolAPI judge call when
the provider recovers; the package is complete and submittable without it.
