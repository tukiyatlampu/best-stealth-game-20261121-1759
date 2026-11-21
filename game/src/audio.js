// SHADOW LEDGER — sound: every effect synthesized with WebAudio.
// One job: footsteps, coin, pickup, alert and win/lose stings, with no
// audio files at all (the game loads nothing over the network).

// All sound is optional: created lazily on the first user gesture, and the
// game plays identically silent when audio is unavailable.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
    return this.muted;
  }

  // Short filtered noise burst: a footstep on stone. `near` 0..1 scales it.
  footstep(near = 0.5) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const dur = 0.07;
    const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5 * near + 0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
  }

  // Two-note metallic clink for a thrown coin.
  coin() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    for (const [freq, when, vol] of [[2093, 0, 0.22], [2637, 0.06, 0.16]]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, t + when);
      gain.gain.exponentialRampToValueAtTime(0.001, t + when + 0.22);
      osc.connect(gain).connect(this.master);
      osc.start(t + when);
      osc.stop(t + when + 0.25);
    }
  }

  // Warm chime when a ledger page is picked up.
  pickup() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [523, 659, 784].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.2, t + i * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.4);
      osc.connect(gain).connect(this.master);
      osc.start(t + i * 0.07);
      osc.stop(t + i * 0.07 + 0.45);
    });
  }

  // Rising two-tone sting when a guard goes from suspicious to alerted.
  alert() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [220, 311].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.16, t + i * 0.12 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.3);
      osc.connect(gain).connect(this.master);
      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.32);
    });
  }

  // Soft descending cue when the heat dies down.
  calm() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(392, t);
    osc.frequency.exponentialRampToValueAtTime(262, t + 0.3);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  win() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t + i * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.2, t + i * 0.11 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.11 + 0.5);
      osc.connect(gain).connect(this.master);
      osc.start(t + i * 0.11);
      osc.stop(t + i * 0.11 + 0.55);
    });
  }

  lose() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [330, 262, 196].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t + i * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.13, t + i * 0.16 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.16 + 0.4);
      osc.connect(gain).connect(this.master);
      osc.start(t + i * 0.16);
      osc.stop(t + i * 0.16 + 0.45);
    });
  }
}
