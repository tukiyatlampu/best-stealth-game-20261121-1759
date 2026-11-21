// SHADOW LEDGER — rendering: every pixel the judge sees.
// One job: draw the night archive — floor, cover, lamps, vision cones,
// guards, the player, noise, and the HUD — on one 1280x800 canvas.

import { CELL, COLS, PALETTE, ROWS, TILE, VIEW_H, VIEW_W, clamp, dist, mulberry32 } from './config.js';
import { GUARD_STATE } from './guards.js';
import { insideCone } from './vision.js';

// Deterministic floor speckle, seeded once so every run paints identically.
const speckle = (() => {
  const rand = mulberry32(20261121);
  const dots = [];
  for (let i = 0; i < 900; i++) {
    dots.push({ x: rand() * VIEW_W, y: rand() * VIEW_H, r: 0.6 + rand() * 1.6, a: 0.03 + rand() * 0.05 });
  }
  return dots;
})();

function coneColor(guard) {
  if (guard.state === GUARD_STATE.ALERTED) return PALETTE.coneAlert;
  if (guard.state === GUARD_STATE.SUSPICIOUS || guard.suspicion > 0.05) return PALETTE.coneSuspicious;
  return PALETTE.coneCalm;
}

function drawCone(ctx, guard) {
  const range = guard.warden ? 285 : 225;
  const half = guard.warden ? (29 * Math.PI) / 180 : (33 * Math.PI) / 180;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, range, guard.heading - half, guard.heading + half);
  ctx.closePath();
  ctx.fillStyle = coneColor(guard);
  ctx.fill();
  ctx.restore();
}

function drawGuard(ctx, guard) {
  const body = guard.warden ? PALETTE.warden : PALETTE.guard;
  const dark = guard.warden ? '#7a3a08' : PALETTE.guardDark;
  // Body: a night-watchman in a red coat, facing `heading`.
  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.rotate(guard.heading);
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  // Shoulder lamp + nose: which way the guard looks, at a glance.
  ctx.fillStyle = '#ffd94d';
  ctx.beginPath();
  ctx.arc(9, -6, 2.4, 0, Math.PI * 2);
  ctx.arc(9, 6, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe9c4';
  ctx.beginPath();
  ctx.moveTo(13, 0);
  ctx.lineTo(5, -5);
  ctx.lineTo(5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // State mark: "?" while suspicious, "!" while hunting.
  if (guard.state === GUARD_STATE.SUSPICIOUS || guard.state === GUARD_STATE.ALERTED) {
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = guard.state === GUARD_STATE.ALERTED ? PALETTE.danger : '#ffb020';
    ctx.fillText(guard.state === GUARD_STATE.ALERTED ? '!' : '?', guard.x, guard.y - 24);
  }
  // Suspicion arc above the head.
  if (guard.suspicion > 0.02 && guard.state !== GUARD_STATE.ALERTED) {
    ctx.strokeStyle = 'rgba(255, 176, 32, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 20, -Math.PI / 2, -Math.PI / 2 + guard.suspicion * Math.PI * 2);
    ctx.stroke();
  }
}

function drawPlayer(ctx, player, inDanger) {
  ctx.save();
  ctx.translate(player.x, player.y);
  // Soft personal light: what is safe to stand in, shown, not told.
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 64);
  glow.addColorStop(0, 'rgba(127, 212, 255, 0.14)');
  glow.addColorStop(1, 'rgba(127, 212, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 64, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(player.heading);
  ctx.fillStyle = PALETTE.playerDark;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  // Hood point + eyes: the thief reads as a person, not a dot.
  ctx.fillStyle = '#0b1526';
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(4, -6);
  ctx.lineTo(4, 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(6, -4, 1.8, 0, Math.PI * 2);
  ctx.arc(6, 4, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (player.sneaking) {
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.hudDim;
    ctx.fillText('SNEAKING', player.x, player.y + 26);
  }
  if (inDanger) {
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.danger;
    ctx.fillText('IN SIGHT!', player.x, player.y - 26);
  }
}

// The world: floor, walls, cover, shadow, lamps, exit, pages, cones, actors.
export function drawWorld(ctx, game) {
  const { level, player, guards, pagesLeft, coinRipples } = game;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  // Floor checker + speckle.
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      ctx.fillStyle = (i + j) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(i * TILE, j * TILE, TILE, TILE);
    }
  }
  ctx.fillStyle = '#ffffff';
  for (const dot of speckle) {
    ctx.globalAlpha = dot.a;
    ctx.fillRect(dot.x, dot.y, dot.r, dot.r);
  }
  ctx.globalAlpha = 1;

  // Shadow zones: darker floor, safe to cross unseen.
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const cell = level.grid[j * COLS + i];
      if (cell === CELL.SHADOW) {
        ctx.fillStyle = PALETTE.shadow;
        ctx.fillRect(i * TILE, j * TILE, TILE, TILE);
      }
    }
  }

  // Lamp pools: warm light on the floor, and danger — you are easier seen.
  for (const lamp of level.lamps) {
    const glow = ctx.createRadialGradient(lamp.x, lamp.y, 4, lamp.x, lamp.y, lamp.r);
    glow.addColorStop(0, PALETTE.lampGlow);
    glow.addColorStop(1, 'rgba(255, 196, 110, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, lamp.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.lampCore;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Walls, crates, shelves.
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const cell = level.grid[j * COLS + i];
      const x = i * TILE;
      const y = j * TILE;
      if (cell === CELL.WALL) {
        ctx.fillStyle = PALETTE.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = PALETTE.wallTop;
        ctx.fillRect(x, y, TILE, 4);
      } else if (cell === CELL.CRATE) {
        ctx.fillStyle = PALETTE.crate;
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = PALETTE.crateEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 2);
        ctx.lineTo(x + TILE - 2, y + TILE - 2);
        ctx.moveTo(x + TILE - 2, y + 2);
        ctx.lineTo(x + 2, y + TILE - 2);
        ctx.stroke();
      } else if (cell === CELL.SHELF) {
        ctx.fillStyle = PALETTE.shelf;
        ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
        ctx.strokeStyle = PALETTE.shelfEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.fillStyle = '#8a6a3c';
        ctx.fillRect(x + 6, y + 8, TILE - 12, 3);
        ctx.fillRect(x + 6, y + 18, TILE - 12, 3);
      }
    }
  }

  // Exit: the green door. Locked until every page is taken.
  const exitOpen = pagesLeft.length === 0;
  const ex = level.exit;
  ctx.save();
  ctx.translate(ex.x, ex.y);
  const pulse = 0.5 + 0.5 * Math.sin(game.time * 2.4);
  const eg = ctx.createRadialGradient(0, 0, 4, 0, 0, 52 + pulse * 8);
  eg.addColorStop(0, exitOpen ? PALETTE.exitGlow : 'rgba(120, 130, 150, 0.25)');
  eg.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = eg;
  ctx.beginPath();
  ctx.arc(0, 0, 52 + pulse * 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = exitOpen ? PALETTE.exit : '#5a6a84';
  ctx.fillRect(-14, -18, 28, 36);
  ctx.fillStyle = '#0b1526';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', 0, 4);
  ctx.restore();

  // Ledger pages: gold documents that shimmer.
  for (const page of pagesLeft) {
    const bob = Math.sin(game.time * 3 + page.x) * 2;
    ctx.save();
    ctx.translate(page.x, page.y + bob);
    ctx.fillStyle = 'rgba(255, 217, 77, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, 16 + pulse * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(-0.12);
    ctx.fillStyle = '#f4ead0';
    ctx.fillRect(-7, -10, 14, 20);
    ctx.strokeStyle = '#b89b3e';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-7, -10, 14, 20);
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(-4, -6, 8, 2);
    ctx.fillRect(-4, -1, 8, 2);
    ctx.fillRect(-4, 4, 5, 2);
    ctx.restore();
  }

  // Coin ripples: the distraction, visible while it rings.
  for (const ripple of coinRipples) {
    ctx.strokeStyle = `rgba(255, 217, 77, ${clamp(ripple.life, 0, 1)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, (1 - ripple.life) * 90 + 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Vision cones first (under the actors), then guards, then the player.
  for (const guard of guards) drawCone(ctx, guard);
  for (const guard of guards) drawGuard(ctx, guard);

  // Player noise ring while walking.
  if (player.noisePulse > 0) {
    ctx.strokeStyle = `rgba(127, 212, 255, ${0.5 * player.noisePulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.noiseRadius * (1.4 - 0.6 * player.noisePulse), 0, Math.PI * 2);
    ctx.stroke();
  }
  const inDanger = guards.some((g) => insideCone(g, player.x, player.y));
  drawPlayer(ctx, player, inDanger);

  // Darkness vignette: the archive at night, lit where it matters.
  const vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.85);
  vg.addColorStop(0, 'rgba(4, 8, 18, 0)');
  vg.addColorStop(1, 'rgba(4, 8, 18, 0.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

// HUD: objective, alert meter, timer, coins, level — always legible.
export function drawHud(ctx, game) {
  const { level, guards, pagesLeft, pagesTotal, levelTime, totalTime } = game;
  const maxSuspicion = guards.reduce((m, g) => Math.max(m, g.suspicion), 0);
  const anyAlerted = guards.some((g) => g.state === GUARD_STATE.ALERTED);

  ctx.fillStyle = PALETTE.hudBg;
  ctx.fillRect(0, 0, VIEW_W, 46);

  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(level.name, 14, 20);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(level.brief, 14, 37);

  // Objective: pages.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.page;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`PAGES ${pagesTotal - pagesLeft.length}/${pagesTotal}`, VIEW_W - 330, 20);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(pagesLeft.length === 0 ? 'All pages — reach the EXIT' : 'Steal every page, then exit unseen', VIEW_W - 330, 37);

  // Alert meter: the loudest guard's suspicion.
  const mx = VIEW_W - 310;
  ctx.textAlign = 'left';
  ctx.fillStyle = anyAlerted ? PALETTE.danger : PALETTE.hudText;
  ctx.font = 'bold 13px system-ui, sans-serif';
  // Only call it SUSPICIOUS once a guard has actually stopped to stare
  // (suspicion >= 0.35); a faint bar below that is just "being noticed".
  ctx.fillText(anyAlerted ? 'SPOTTED!' : maxSuspicion >= 0.35 ? 'SUSPICIOUS…' : maxSuspicion > 0.05 ? 'NOTICED…' : 'UNSEEN', mx, 20);
  ctx.fillStyle = '#26304a';
  ctx.fillRect(mx, 26, 150, 10);
  ctx.fillStyle = anyAlerted ? PALETTE.danger : maxSuspicion > 0.35 ? '#ffb020' : PALETTE.ok;
  ctx.fillRect(mx, 26, 150 * clamp(maxSuspicion, 0, 1), 10);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx, 26, 150, 10);

  // Coins + timer, right edge.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`◉ ${game.player.coins}`, VIEW_W - 96, 20);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '12px system-ui, sans-serif';
  const t = Math.floor(levelTime);
  const tt = Math.floor(totalTime);
  ctx.fillText(`⏱ ${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}  ·  total ${String(Math.floor(tt / 60)).padStart(2, '0')}:${String(tt % 60).padStart(2, '0')}`, VIEW_W - 14, 37);

  // Bottom hint bar.
  ctx.fillStyle = PALETTE.hudBg;
  ctx.fillRect(0, VIEW_H - 26, VIEW_W, 26);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WASD / arrows — move    ·    SHIFT — sneak (silent, harder to see)    ·    CLICK — throw a coin to distract    ·    M — mute    ·    P — pause', VIEW_W / 2, VIEW_H - 9);
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(4, 8, 18, 0.66)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 70);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '17px system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, VIEW_H / 2 - 20 + i * 30));
}

// Full-screen states, drawn over the frozen world.
export function drawTitle(ctx) {
  overlay(ctx, 'SHADOW LEDGER', [
    'Night at the Meridian Archive. Three ledger pages. One way out.',
    'Guards patrol with vision cones — crates and shelves block their sight.',
    'Sneak in shadow, throw coins to pull a patrol away, reach the green EXIT unseen.',
    '',
    'Press ENTER or CLICK to begin  ·  WASD move  ·  SHIFT sneak  ·  CLICK throw coin',
  ], PALETTE.page);
}

export function drawCaught(ctx, levelTime) {
  overlay(ctx, 'CAUGHT!', [
    `A guard laid hands on you after ${Math.floor(levelTime)}s in the dark.`,
    'The ledger stays in the archive. For now.',
    '',
    'Press R to try this night again  ·  ENTER for the title screen',
  ], PALETTE.danger);
}

export function drawLevelClear(ctx, levelName, levelTime, ghost, last) {
  overlay(ctx, 'CLEAN GETAWAY', [
    `${levelName} — cleared in ${Math.floor(levelTime)}s${ghost ? ' — never once spotted. A ghost.' : '.'}`,
    last ? 'That was the last night. The ledger is yours.' : 'The next night waits. Deeper rooms, sharper eyes.',
    '',
    last ? 'Press ENTER to claim the ledger' : 'Press ENTER for the next night',
  ], PALETTE.ok);
}

export function drawVictory(ctx, totalTime, ghostNights) {
  overlay(ctx, 'THE LEDGER IS YOURS', [
    `All three nights cleared in ${Math.floor(totalTime)}s — ${ghostNights} of them without ever being spotted.`,
    'Wren slips into the rain with the Meridian Archive in her coat.',
    'No alarms that mattered. No names left behind.',
    '',
    'Press R to run it all again',
  ], PALETTE.page);
}

export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(4, 8, 18, 0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('Press P to resume', VIEW_W / 2, VIEW_H / 2 + 34);
}
