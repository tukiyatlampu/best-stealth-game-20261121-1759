// SHADOW LEDGER — the player: Wren, courier-thief of the Meridian Archive.
// One job: movement, stance, noise and the coin distraction. Nothing else.

import { PLAYER, clamp } from './config.js';
import { isSolid } from './levels.js';

export class Player {
  constructor(start) {
    this.x = start.x;
    this.y = start.y;
    this.radius = PLAYER.radius;
    this.heading = -Math.PI / 2; // faces up the foyer at spawn
    this.sneaking = false;
    this.moving = false;
    this.coins = PLAYER.coinsStart;
    this.stepTimer = 0;
    this.noisePulse = 0; // 0..1 visual ring strength after a loud step
    this.noiseRadius = 0;
  }

  reset(start) {
    this.x = start.x;
    this.y = start.y;
    this.heading = -Math.PI / 2;
    this.sneaking = false;
    this.moving = false;
    this.coins = PLAYER.coinsStart;
    this.noisePulse = 0;
    this.noiseRadius = 0;
  }

  hitsWall(level, x, y) {
    const r = this.radius;
    return (
      isSolid(level, x - r, y - r) || isSolid(level, x + r, y - r) ||
      isSolid(level, x - r, y + r) || isSolid(level, x + r, y + r)
    );
  }

  // input: {x, y} unit vector from keys; sneaking from Shift.
  // Returns 'step' when a footstep lands (for sound + noise), else null.
  update(level, input, dt) {
    this.sneaking = !!input.sneak;
    const mag = Math.hypot(input.x, input.y);
    this.moving = mag > 0.01;
    if (!this.moving) {
      this.noisePulse = Math.max(0, this.noisePulse - dt * 2);
      return null;
    }
    const nx = input.x / mag;
    const ny = input.y / mag;
    const speed = this.sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    const vx = nx * speed * dt;
    const vy = ny * speed * dt;
    if (!this.hitsWall(level, this.x + vx, this.y)) this.x += vx;
    if (!this.hitsWall(level, this.x, this.y + vy)) this.y += vy;
    this.heading = Math.atan2(ny, nx);

    // Footsteps: walking is audible nearby, sneaking is silent.
    this.stepTimer -= dt;
    if (this.stepTimer <= 0) {
      this.stepTimer = this.sneaking ? 0.55 : 0.38;
      if (!this.sneaking) {
        this.noisePulse = 1;
        this.noiseRadius = PLAYER.walkNoiseRadius;
        return 'step';
      }
    }
    this.noisePulse = Math.max(0, this.noisePulse - dt * 2);
    return null;
  }

  // Throw a coin toward a world point. Returns the landing point, or null
  // when out of coins or out of range. The clink is a noise event guards
  // investigate — the classic way to pull a patrol off its round.
  throwCoin(tx, ty) {
    if (this.coins <= 0) return null;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d > PLAYER.coinRange || d < 12) return null;
    this.coins -= 1;
    const land = { x: this.x + (dx / d) * Math.min(d, PLAYER.coinRange), y: this.y + (dy / d) * Math.min(d, PLAYER.coinRange) };
    return land;
  }

  // Distance the player is from being heard right now (for the HUD ring).
  currentNoiseRadius() {
    if (!this.moving || this.sneaking) return 0;
    return PLAYER.walkNoiseRadius;
  }
}
