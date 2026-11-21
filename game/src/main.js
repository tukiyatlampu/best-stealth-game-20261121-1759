// SHADOW LEDGER — main: the game loop, screens and the rules that bind
// the modules together. One job: own the state machine (title / playing /
// caught / level clear / victory / paused) and drive one frame at a time.

import { VIEW_H, VIEW_W, dist } from './config.js';
import { LEVEL_COUNT, buildLevel, levelBrief, levelName } from './levels.js';
import { Guard, GUARD_STATE } from './guards.js';
import { Player } from './player.js';
import { SoundBank } from './audio.js';
import { Input } from './input.js';
import { drawCaught, drawHud, drawLevelClear, drawPaused, drawTitle, drawVictory, drawWorld } from './render.js';
import { stageShot } from './shots.js';

export const GAME_STATE = {
  TITLE: 'title',
  PLAYING: 'playing',
  CAUGHT: 'caught',
  LEVEL_CLEAR: 'level-clear',
  VICTORY: 'victory',
  PAUSED: 'paused',
};

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sounds = new SoundBank();
    this.input = new Input(
      canvas,
      (x, y) => this.onClick(x, y),
      () => this.sounds.ensure(),
    );
    this.state = GAME_STATE.TITLE;
    this.levelIndex = 0;
    this.level = null;
    this.player = null;
    this.guards = [];
    this.pagesLeft = [];
    this.pagesTotal = 0;
    this.coinRipples = [];
    this.coinTargets = [];
    this.time = 0;
    this.levelTime = 0;
    this.totalTime = 0;
    this.ghost = true; // never spotted this level
    this.ghostNights = 0;
    this.wasAlerted = false;
    this.lastTimestamp = 0;
    this.shotMode = null;
    this.loadLevel(0);
    window.__game = this; // play-test hook: state readable from the console
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.level = buildLevel(index);
    this.player = new Player(this.level.playerStart);
    this.guards = this.level.guards.map((g, i) => new Guard(g, i));
    this.pagesLeft = this.level.pages.map((p) => ({ ...p }));
    this.pagesTotal = this.pagesLeft.length;
    this.coinRipples = [];
    this.coinTargets = [];
    this.levelTime = 0;
    this.ghost = true;
    this.wasAlerted = false;
  }

  startGame() {
    this.totalTime = 0;
    this.ghostNights = 0;
    this.loadLevel(0);
    this.state = GAME_STATE.PLAYING;
  }

  onClick(x, y) {
    if (this.state === GAME_STATE.TITLE) {
      this.startGame();
      return;
    }
    if (this.state === GAME_STATE.CAUGHT || this.state === GAME_STATE.VICTORY) return;
    if (this.state === GAME_STATE.LEVEL_CLEAR) {
      this.nextLevel();
      return;
    }
    if (this.state !== GAME_STATE.PLAYING) return;
    // Click inside the playfield throws a coin; HUD clicks do nothing.
    if (y < 46 || y > VIEW_H - 26) return;
    const land = this.player.throwCoin(x, y);
    if (land) {
      this.sounds.coin();
      this.coinTargets.push({ ...land, life: 1 });
      for (const guard of this.guards) guard.hearNoise(land.x, land.y);
    }
  }

  nextLevel() {
    if (this.levelIndex + 1 >= LEVEL_COUNT) {
      this.state = GAME_STATE.VICTORY;
      this.sounds.win();
      return;
    }
    this.loadLevel(this.levelIndex + 1);
    this.state = GAME_STATE.PLAYING;
  }

  onCaught() {
    if (this.state !== GAME_STATE.PLAYING) return;
    this.state = GAME_STATE.CAUGHT;
    this.sounds.lose();
  }

  update(dt) {
    if (this.state !== GAME_STATE.PLAYING) return;
    this.time += dt;
    this.levelTime += dt;
    this.totalTime += dt;

    // Player movement + footsteps.
    const step = this.player.update(this.level, this.input.moveVector(), dt);
    if (step === 'step') this.sounds.footstep(0.5);

    // Coin ripples fade; their noise already pulled guards once.
    for (const ripple of this.coinTargets) ripple.life -= dt * 0.8;
    this.coinTargets = this.coinTargets.filter((r) => r.life > 0);
    this.coinRipples = this.coinTargets;

    // Guards see, chase, search, return.
    let anyAlerted = false;
    for (const guard of this.guards) {
      const wasState = guard.state;
      guard.update(
        this.level,
        this.player,
        dt,
        () => this.onCaught(),
        (g) => this.sounds.footstep(Math.max(0.15, 1 - dist(g.x, g.y, this.player.x, this.player.y) / 250)),
      );
      if (guard.state === GUARD_STATE.ALERTED) anyAlerted = true;
      if (wasState !== GUARD_STATE.ALERTED && guard.state === GUARD_STATE.ALERTED) {
        this.sounds.alert();
        this.ghost = false;
      }
    }
    if (this.wasAlerted && !anyAlerted) this.sounds.calm();
    this.wasAlerted = anyAlerted;

    // Ledger pages: walk over one to take it.
    for (let i = this.pagesLeft.length - 1; i >= 0; i--) {
      const page = this.pagesLeft[i];
      if (dist(this.player.x, this.player.y, page.x, page.y) < 26) {
        this.pagesLeft.splice(i, 1);
        this.sounds.pickup();
      }
    }

    // Exit: open once every page is taken; step in to clear the night.
    if (this.pagesLeft.length === 0) {
      if (dist(this.player.x, this.player.y, this.level.exit.x, this.level.exit.y) < 30) {
        if (this.ghost) this.ghostNights += 1;
        this.sounds.win();
        this.state = GAME_STATE.LEVEL_CLEAR;
      }
    }
  }

  handleKeys() {
    if (this.input.tappedKey('m')) {
      this.sounds.toggleMute();
    }
    if (this.input.tappedKey('p') && (this.state === GAME_STATE.PLAYING || this.state === GAME_STATE.PAUSED)) {
      this.state = this.state === GAME_STATE.PLAYING ? GAME_STATE.PAUSED : GAME_STATE.PLAYING;
    }
    if (this.input.tappedKey('enter')) {
      if (this.state === GAME_STATE.TITLE) this.startGame();
      else if (this.state === GAME_STATE.LEVEL_CLEAR) this.nextLevel();
      else if (this.state === GAME_STATE.CAUGHT) this.state = GAME_STATE.TITLE;
    }
    if (this.input.tappedKey('r')) {
      if (this.state === GAME_STATE.CAUGHT) this.loadLevel(this.levelIndex), (this.state = GAME_STATE.PLAYING);
      else if (this.state === GAME_STATE.VICTORY) this.startGame();
    }
  }

  frame(timestamp) {
    const dt = Math.min(0.05, (timestamp - this.lastTimestamp) / 1000 || 0.016);
    this.lastTimestamp = timestamp;
    this.handleKeys();
    if (!this.shotMode) this.update(dt);
    drawWorld(this.ctx, this);
    drawHud(this.ctx, this);
    if (this.state === GAME_STATE.TITLE) drawTitle(this.ctx);
    else if (this.state === GAME_STATE.CAUGHT) drawCaught(this.ctx, this.levelTime);
    else if (this.state === GAME_STATE.LEVEL_CLEAR) drawLevelClear(this.ctx, levelName(this.levelIndex), this.levelTime, this.ghost, this.levelIndex + 1 >= LEVEL_COUNT);
    else if (this.state === GAME_STATE.VICTORY) drawVictory(this.ctx, this.totalTime, this.ghostNights);
    else if (this.state === GAME_STATE.PAUSED) drawPaused(this.ctx);
    requestAnimationFrame((t) => this.frame(t));
  }

  run() {
    // A ?shot= name freezes a staged scene for screenshots (see shots.js);
    // normal play runs the loop live.
    this.shotMode = stageShot(this);
    requestAnimationFrame((t) => this.frame(t));
  }
}

// Boot: canvas is 1280x800 fixed — the size the screenshots are taken at.
const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const game = new Game(canvas);
game.run();
