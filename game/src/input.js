// SHADOW LEDGER — input: keyboard movement and mouse coin throws.
// One job: turn raw events into a clean per-frame intent the game reads.

export class Input {
  constructor(canvas, onCoinThrow, onAnyGesture) {
    this.keys = new Set();
    // Taps: keys pressed since the last frame consumed them. A quick tap
    // must not be lost between frames, so taps live apart from held keys
    // and are cleared only when the game reads them.
    this.tapped = new Set();
    this.mouse = { x: 0, y: 0, clicked: false };
    this.onCoinThrow = onCoinThrow;
    this.onAnyGesture = onAnyGesture;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      this.keys.add(e.key.toLowerCase());
      this.tapped.add(e.key.toLowerCase());
      if (this.onAnyGesture) this.onAnyGesture();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * canvas.width;
      this.mouse.y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    });
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
      if (this.onAnyGesture) this.onAnyGesture();
      if (this.onCoinThrow) this.onCoinThrow(x, y);
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Unit movement vector from WASD / arrows. Shift = sneak.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    return { x, y, sneak: this.keys.has('shift') };
  }

  pressed(key) {
    return this.keys.has(key.toLowerCase());
  }

  // True once per key tap; consumes it so the next frame does not re-fire.
  tappedKey(key) {
    const k = key.toLowerCase();
    if (!this.tapped.has(k)) return false;
    this.tapped.delete(k);
    return true;
  }
}
