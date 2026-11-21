// SHADOW LEDGER — level definitions and the level builder.
// One job: turn a compact level spec (rects + points) into a playable grid.
// Levels are data, not code: three nights in the Meridian Archive.

import { CELL, COLS, ROWS } from './config.js';

// A level spec: walls/crates/shelves/shadows as tile rects [x, y, w, h],
// lamps as {x, y, r} tile points, pages/exit/player as tile points, guards
// as { waypoints: [[x, y], ...], warden?: true } in tile coords.
const LEVELS = [
  {
    name: 'NIGHT 1 — THE FOYER',
    brief: 'Learn the dark. Take all 3 ledger pages, then slip out the green exit.',
    player: [3, 21],
    exit: [37, 2],
    pages: [[19, 4], [6, 12], [33, 19]],
    lamps: [{ x: 10, y: 6, r: 3 }, { x: 26, y: 6, r: 3 }, { x: 10, y: 18, r: 3 }, { x: 30, y: 15, r: 3 }],
    walls: [
      [13, 2, 1, 7], // reading-room divider, gap at the bottom
      [13, 12, 1, 6],
      [24, 8, 9, 1], // long desk wall, gap on both ends
      [24, 17, 9, 1],
      [6, 8, 6, 1],
    ],
    crates: [
      [8, 4, 2, 1],
      [18, 10, 2, 1],
      [28, 12, 1, 2],
      [9, 15, 2, 1],
      [33, 8, 1, 2],
      [21, 20, 2, 1],
    ],
    shelves: [
      [16, 3, 1, 4],
      [30, 4, 1, 3],
      [5, 16, 1, 4],
      [35, 15, 1, 4],
    ],
    shadows: [
      [2, 2, 5, 3],
      [34, 20, 4, 3],
      [15, 19, 5, 3],
      [27, 2, 4, 2],
    ],
    guards: [
      { waypoints: [[10, 4], [22, 4], [22, 10], [10, 10]] },
      { waypoints: [[30, 20], [18, 20], [18, 14], [30, 14]] },
    ],
  },
  {
    name: 'NIGHT 2 — READING ROOMS',
    brief: 'Three guards, crossing patrols. Coins distract — click to throw one.',
    player: [2, 22],
    exit: [37, 22],
    pages: [[8, 3], [20, 12], [34, 3]],
    lamps: [{ x: 8, y: 8, r: 3 }, { x: 20, y: 5, r: 3 }, { x: 32, y: 8, r: 3 }, { x: 20, y: 19, r: 3 }, { x: 32, y: 19, r: 3 }],
    walls: [
      [9, 2, 1, 8],
      [9, 15, 1, 8],
      [19, 2, 1, 5],
      [19, 18, 1, 5],
      [29, 2, 1, 8],
      [29, 15, 1, 8],
      [12, 11, 6, 1],
      [23, 12, 6, 1],
    ],
    crates: [
      [4, 10, 2, 1],
      [14, 6, 1, 2],
      [24, 8, 2, 1],
      [34, 12, 2, 1],
      [14, 18, 2, 1],
      [24, 20, 1, 2],
      [36, 17, 1, 2],
    ],
    shelves: [
      [5, 4, 1, 3],
      [16, 15, 1, 4],
      [26, 4, 1, 3],
      [35, 5, 1, 4],
      [11, 20, 1, 2],
    ],
    shadows: [
      [2, 13, 4, 3],
      [21, 21, 4, 2],
      [36, 9, 2, 4],
      [12, 2, 4, 2],
      [31, 21, 4, 2],
    ],
    guards: [
      { waypoints: [[5, 6], [15, 6], [15, 18], [5, 18]] },
      { waypoints: [[34, 6], [24, 6], [24, 18], [34, 18]] },
      { waypoints: [[20, 3], [20, 21]] },
    ],
  },
  {
    name: 'NIGHT 3 — THE VAULT HALL',
    brief: 'The warden sees farther. Four guards, one hall, no second chances.',
    player: [2, 12],
    exit: [37, 12],
    pages: [[10, 4], [20, 21], [31, 4]],
    lamps: [{ x: 10, y: 12, r: 3 }, { x: 20, y: 6, r: 3 }, { x: 20, y: 18, r: 3 }, { x: 30, y: 12, r: 3 }],
    walls: [
      [14, 5, 1, 6],
      [14, 14, 1, 6],
      [25, 5, 1, 6],
      [25, 14, 1, 6],
    ],
    crates: [
      [6, 6, 2, 1],
      [6, 18, 2, 1],
      [17, 10, 2, 1],
      [17, 14, 2, 1],
      [21, 10, 2, 1],
      [21, 14, 2, 1],
      [32, 6, 2, 1],
      [32, 18, 2, 1],
      [10, 12, 1, 2],
      [29, 12, 1, 2],
    ],
    shelves: [
      [9, 3, 1, 2],
      [30, 20, 1, 2],
      [19, 2, 2, 1],
      [19, 22, 2, 1],
    ],
    shadows: [
      [3, 3, 4, 3],
      [3, 19, 4, 3],
      [33, 3, 4, 3],
      [33, 19, 4, 3],
      [18, 11, 4, 3],
    ],
    guards: [
      { waypoints: [[8, 8], [18, 8], [18, 16], [8, 16]] },
      { waypoints: [[31, 8], [21, 8], [21, 16], [31, 16]] },
      { waypoints: [[20, 4], [20, 20]] },
      { waypoints: [[12, 20], [28, 20], [28, 4], [12, 4]] },
      { waypoints: [[20, 12], [34, 12], [34, 6], [6, 6], [6, 18], [34, 18]], warden: true },
    ],
  },
];

export const LEVEL_COUNT = LEVELS.length;

export function levelName(i) {
  return LEVELS[i].name;
}

export function levelBrief(i) {
  return LEVELS[i].brief;
}

function paintRect(grid, rect, cell) {
  const [x, y, w, h] = rect;
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) {
      if (i >= 0 && i < COLS && j >= 0 && j < ROWS) grid[j * COLS + i] = cell;
    }
  }
}

// Build the runtime level: a flat grid plus pixel-space points.
export function buildLevel(index) {
  const spec = LEVELS[index];
  const grid = new Uint8Array(COLS * ROWS).fill(CELL.FLOOR);
  for (let i = 0; i < COLS; i++) {
    grid[i] = CELL.WALL;
    grid[(ROWS - 1) * COLS + i] = CELL.WALL;
  }
  for (let j = 0; j < ROWS; j++) {
    grid[j * COLS] = CELL.WALL;
    grid[j * COLS + COLS - 1] = CELL.WALL;
  }
  for (const r of spec.walls) paintRect(grid, r, CELL.WALL);
  for (const r of spec.crates) paintRect(grid, r, CELL.CRATE);
  for (const r of spec.shelves) paintRect(grid, r, CELL.SHELF);
  for (const r of spec.shadows) paintRect(grid, r, CELL.SHADOW);

  const toPx = ([tx, ty]) => ({ x: (tx + 0.5) * 32, y: (ty + 0.5) * 32 });
  return {
    index,
    name: spec.name,
    brief: spec.brief,
    grid,
    playerStart: toPx(spec.player),
    exit: toPx(spec.exit),
    pages: spec.pages.map(toPx),
    lamps: spec.lamps.map((l) => ({ x: (l.x + 0.5) * 32, y: (l.y + 0.5) * 32, r: l.r * 32 })),
    guards: spec.guards.map((g) => ({
      waypoints: g.waypoints.map(toPx),
      warden: !!g.warden,
    })),
  };
}

// Tile lookup helpers shared by physics and AI.
export function cellAt(level, px, py) {
  const tx = Math.floor(px / 32);
  const ty = Math.floor(py / 32);
  if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return CELL.WALL;
  return level.grid[ty * COLS + tx];
}

export function isSolid(level, px, py) {
  const c = cellAt(level, px, py);
  return c === CELL.WALL || c === CELL.CRATE || c === CELL.SHELF;
}

export function isShadow(level, px, py) {
  return cellAt(level, px, py) === CELL.SHADOW;
}

export function inLamp(level, px, py) {
  for (const lamp of level.lamps) {
    const dx = px - lamp.x;
    const dy = py - lamp.y;
    if (dx * dx + dy * dy < lamp.r * lamp.r) return true;
  }
  return false;
}
