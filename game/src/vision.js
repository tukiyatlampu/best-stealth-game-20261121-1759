// SHADOW LEDGER — vision: line of sight and the guard's vision cone.
// One job: answer "can this guard see that point right now?" Truthfully:
// walls, crates and shelves block sight; distance, angle, light and the
// player's stance all shape the answer.

import { BLOCKS_SIGHT, GUARD, angleDiff, clamp, dist } from './config.js';
import { cellAt, inLamp, isShadow } from './levels.js';

// Step along the segment in small increments; any sight-blocking cell in
// the way means no line of sight. Cheap, exact enough for a 32px grid.
export function hasLineOfSight(level, ax, ay, bx, by) {
  const d = dist(ax, ay, bx, by);
  const steps = Math.max(1, Math.ceil(d / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const cx = ax + (bx - ax) * t;
    const cy = ay + (by - ay) * t;
    if (BLOCKS_SIGHT.has(cellAt(level, cx, cy))) return false;
  }
  return true;
}

// Full visibility test. Returns { seen, exposure } where exposure 0..1 is
// how strongly the player reads (drives suspicion speed).
export function canGuardSee(level, guard, px, py, sneaking) {
  const range = guard.warden ? GUARD.wardenConeRange : GUARD.coneRange;
  const half = guard.warden ? GUARD.wardenConeHalfAngle : GUARD.coneHalfAngle;
  const d = dist(guard.x, guard.y, px, py);
  if (d > range) return { seen: false, exposure: 0 };
  if (d > GUARD.bumpDistance) {
    const angleTo = Math.atan2(py - guard.y, px - guard.x);
    if (angleDiff(angleTo, guard.heading) > half) return { seen: false, exposure: 0 };
  }
  if (!hasLineOfSight(level, guard.x, guard.y, px, py)) return { seen: false, exposure: 0 };

  // Exposure: close reads stronger; sneaking halves it; lamplight raises
  // it; standing in shadow lowers it.
  let exposure = clamp(1.15 - d / range, 0.15, 1);
  if (sneaking) exposure *= 0.55;
  if (inLamp(level, px, py)) exposure *= 1.6;
  if (isShadow(level, px, py)) exposure *= 0.45;
  return { seen: true, exposure: clamp(exposure, 0, 1) };
}

// Is a world point inside a guard's drawn cone (for the "in the light"
// warning shown under the player)? Cone shape only, no LOS.
export function insideCone(guard, px, py) {
  const range = guard.warden ? GUARD.wardenConeRange : GUARD.coneRange;
  const half = guard.warden ? GUARD.wardenConeHalfAngle : GUARD.coneHalfAngle;
  if (dist(guard.x, guard.y, px, py) > range) return false;
  const angleTo = Math.atan2(py - guard.y, px - guard.x);
  return angleDiff(angleTo, guard.heading) <= half;
}
