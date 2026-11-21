// SHADOW LEDGER — tuning constants, palette and shared helpers.
// One job: every number the game balances on lives here, so tuning never
// means hunting through gameplay code.

export const TILE = 32;
export const COLS = 40;
export const ROWS = 25;
export const VIEW_W = COLS * TILE; // 1280
export const VIEW_H = ROWS * TILE; // 800

// Cell types in the level grid.
export const CELL = {
  FLOOR: 0,
  WALL: 1,
  CRATE: 2, // low cover: blocks movement and line of sight
  SHELF: 3, // tall cover: blocks movement and line of sight
  SHADOW: 4, // dark floor: harder to be seen here
};
export const SOLID = new Set([CELL.WALL, CELL.CRATE, CELL.SHELF]);
export const BLOCKS_SIGHT = new Set([CELL.WALL, CELL.CRATE, CELL.SHELF]);

// Player movement (pixels per second).
export const PLAYER = {
  radius: 13,
  walkSpeed: 165,
  sneakSpeed: 96,
  walkNoiseRadius: 70, // guards hear walking this far
  sneakNoiseRadius: 0, // sneaking is silent
  coinRange: 320,
  coinsStart: 3,
};

// Guard vision and AI tuning.
export const GUARD = {
  radius: 14,
  patrolSpeed: 78,
  chaseSpeed: 178,
  searchSpeed: 110,
  returnSpeed: 95,
  coneRange: 225,
  coneHalfAngle: (33 * Math.PI) / 180,
  wardenConeRange: 285,
  wardenConeHalfAngle: (29 * Math.PI) / 180,
  // Suspicion 0..1. Fills in ~0.8s at point blank, ~2.5s at cone edge.
  suspicionRate: 1.7,
  suspicionDecay: 0.45,
  suspiciousAt: 0.35, // "?" — guard stops and stares
  catchDistance: 27, // closer than this while alerted = caught
  bumpDistance: 42, // seen this close = instant alert
  loseSightSeconds: 4, // alerted without sight this long -> search
  searchSeconds: 5,
  hearRadius: 270, // noise events heard this far
  footstepRadius: 250, // player hears guard footsteps this far
};

// Palette: night archive — cold blue dark, warm lamp pools, red guards.
export const PALETTE = {
  floorA: '#1c2438',
  floorB: '#182033',
  wall: '#0d1220',
  wallTop: '#2c3a5e',
  crate: '#6b4f2a',
  crateEdge: '#8a6a3c',
  shelf: '#3a2f22',
  shelfEdge: '#5a4a34',
  shadow: '#101827',
  lampGlow: 'rgba(255, 196, 110, 0.16)',
  lampCore: '#ffcf7d',
  exit: '#39d98a',
  exitGlow: 'rgba(57, 217, 138, 0.35)',
  page: '#ffd94d',
  player: '#7fd4ff',
  playerDark: '#2b7ea8',
  guard: '#e5484d',
  guardDark: '#8f1d22',
  warden: '#ff7a1a',
  coneCalm: 'rgba(255, 214, 90, 0.20)',
  coneSuspicious: 'rgba(255, 166, 0, 0.34)',
  coneAlert: 'rgba(255, 59, 48, 0.42)',
  hudBg: 'rgba(8, 12, 24, 0.82)',
  hudText: '#e8eefc',
  hudDim: '#93a3c4',
  danger: '#ff5a4e',
  ok: '#39d98a',
};

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

// Smallest absolute angle between two headings, 0..PI.
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

// Deterministic PRNG (mulberry32) so renders and levels never depend on
// Math.random or the clock.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
