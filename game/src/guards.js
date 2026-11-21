// SHADOW LEDGER — guard AI: patrol, suspicion, chase, search, return.
// One job: make every guard behave like a person on a round — learnable
// patrols, a stare before the chase, and a real chance to recover.

import { GUARD, clamp, dist } from './config.js';
import { isSolid } from './levels.js';
import { canGuardSee } from './vision.js';

export const GUARD_STATE = {
  PATROL: 'patrol',
  SUSPICIOUS: 'suspicious',
  ALERTED: 'alerted',
  SEARCH: 'search',
  RETURN: 'return',
};

export class Guard {
  constructor(def, index) {
    this.index = index;
    this.warden = def.warden;
    this.waypoints = def.waypoints;
    this.x = def.waypoints[0].x;
    this.y = def.waypoints[0].y;
    this.heading = 0;
    this.state = GUARD_STATE.PATROL;
    this.waypointIndex = 1 % def.waypoints.length;
    this.suspicion = 0;
    this.lastSeen = null; // {x, y} of the player, when last truly seen
    this.loseSightTimer = 0;
    this.searchTimer = 0;
    this.pauseTimer = 0.6; // brief look-around at each waypoint
    this.stepPhase = index * 1.7; // cosmetic footstep offset, deterministic
    this.stepTimer = 0;
    this.noiseTarget = null; // {x, y} a noise event sent us to check
    this.time = 0; // own clock: heading wobble must not read the wall clock
  }

  // Move toward a point with axis-separated collision (slides along walls).
  moveToward(level, tx, ty, speed, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) return true;
    const vx = (dx / d) * speed * dt;
    const vy = (dy / d) * speed * dt;
    const r = GUARD.radius;
    if (!this.hitsWall(level, this.x + vx, this.y, r)) this.x += vx;
    if (!this.hitsWall(level, this.x, this.y + vy, r)) this.y += vy;
    this.heading = Math.atan2(dy, dx);
    return d < speed * dt + 2;
  }

  hitsWall(level, x, y, r) {
    return (
      isSolid(level, x - r, y - r) || isSolid(level, x + r, y - r) ||
      isSolid(level, x - r, y + r) || isSolid(level, x + r, y + r)
    );
  }

  hearNoise(x, y) {
    // A noise event pulls a patrolling or searching guard to investigate.
    if (this.state === GUARD_STATE.ALERTED) return;
    if (dist(this.x, this.y, x, y) > GUARD.hearRadius) return;
    this.noiseTarget = { x, y };
    if (this.state === GUARD_STATE.PATROL || this.state === GUARD_STATE.RETURN) {
      this.state = GUARD_STATE.SEARCH;
      this.searchTimer = GUARD.searchSeconds;
    }
  }

  update(level, player, dt, onCaught, onFootstep) {
    this.time += dt;
    const seen = canGuardSee(level, this, player.x, player.y, player.sneaking);
    const d = dist(this.x, this.y, player.x, player.y);

    // --- perception: suspicion fills while seen, drains while hidden.
    if (seen.seen) {
      this.lastSeen = { x: player.x, y: player.y };
      this.loseSightTimer = 0;
      const rate = GUARD.suspicionRate * seen.exposure;
      this.suspicion = clamp(this.suspicion + rate * dt, 0, 1);
      if (d < GUARD.bumpDistance) this.suspicion = 1;
    } else {
      this.suspicion = clamp(this.suspicion - GUARD.suspicionDecay * dt, 0, 1);
      if (this.state === GUARD_STATE.ALERTED) {
        this.loseSightTimer += dt;
      }
    }
    if (this.suspicion >= 1 && this.state !== GUARD_STATE.ALERTED) {
      this.state = GUARD_STATE.ALERTED;
      this.loseSightTimer = 0;
    } else if (this.suspicion >= GUARD.suspiciousAt && this.state === GUARD_STATE.PATROL) {
      this.state = GUARD_STATE.SUSPICIOUS;
    } else if (this.suspicion < GUARD.suspiciousAt && this.state === GUARD_STATE.SUSPICIOUS) {
      this.state = GUARD_STATE.PATROL;
    }

    // --- behaviour per state.
    switch (this.state) {
      case GUARD_STATE.PATROL: {
        if (this.pauseTimer > 0) {
          this.pauseTimer -= dt;
          this.heading += Math.sin(this.time * 1.1 + this.index) * 0.002;
          break;
        }
        const wp = this.waypoints[this.waypointIndex];
        if (this.moveToward(level, wp.x, wp.y, GUARD.patrolSpeed, dt)) {
          this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
          this.pauseTimer = 0.9;
        }
        break;
      }
      case GUARD_STATE.SUSPICIOUS: {
        // Stop, stare at the last seen spot: the near-miss warning.
        if (this.lastSeen) {
          this.heading = Math.atan2(this.lastSeen.y - this.y, this.lastSeen.x - this.x);
        }
        break;
      }
      case GUARD_STATE.ALERTED: {
        const target = seen.seen ? { x: player.x, y: player.y } : this.lastSeen;
        if (target) this.moveToward(level, target.x, target.y, GUARD.chaseSpeed, dt);
        if (d < GUARD.catchDistance) onCaught(this);
        if (this.loseSightTimer > GUARD.loseSightSeconds) {
          this.state = GUARD_STATE.SEARCH;
          this.searchTimer = GUARD.searchSeconds;
        }
        break;
      }
      case GUARD_STATE.SEARCH: {
        const target = this.noiseTarget ?? this.lastSeen;
        if (target) {
          const arrived = this.moveToward(level, target.x, target.y, GUARD.searchSpeed, dt);
          if (arrived) this.noiseTarget = null;
        }
        this.searchTimer -= dt;
        // Sweep the head while searching: a fair chance to be re-spotted.
        this.heading += dt * 1.4;
        if (this.searchTimer <= 0) this.state = GUARD_STATE.RETURN;
        break;
      }
      case GUARD_STATE.RETURN: {
        // Walk back to the nearest waypoint, then resume the round.
        let best = 0;
        let bestD = Infinity;
        this.waypoints.forEach((wp, i) => {
          const dd = dist(this.x, this.y, wp.x, wp.y);
          if (dd < bestD) { bestD = dd; best = i; }
        });
        this.waypointIndex = best;
        const wp = this.waypoints[this.waypointIndex];
        if (this.moveToward(level, wp.x, wp.y, GUARD.returnSpeed, dt)) {
          this.state = GUARD_STATE.PATROL;
          this.pauseTimer = 0.5;
        }
        break;
      }
    }

    // Footstep ticks: the player hears a nearby guard coming.
    this.stepTimer -= dt * (this.state === GUARD_STATE.ALERTED ? 2.2 : 1);
    if (this.stepTimer <= 0) {
      this.stepTimer = 0.55;
      if (dist(this.x, this.y, player.x, player.y) < GUARD.footstepRadius) {
        onFootstep(this);
      }
    }
  }
}
