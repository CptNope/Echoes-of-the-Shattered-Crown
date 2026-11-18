// Original procedural glass-and-strings sketch. No samples or external recordings.
export class AudioScore {
  ctx: AudioContext | null = null;
  timer: ReturnType<typeof setInterval> | null = null;
  step = 0;
  volume = 0.12;
  tone(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    gain = 0.15,
  ) {
    if (!this.ctx) return;
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.value = frequency;
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(gain * this.volume, c.currentTime + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + duration);
  }
  async start() {
    if (!this.ctx) this.ctx = new AudioContext();
    await this.ctx.resume();
    if (this.timer) return;
    const notes = [
      220, 261.63, 329.63, 293.66, 196, 246.94, 293.66, 261.63, 174.61, 220,
      261.63, 329.63, 196, 246.94, 293.66, 392,
    ];
    const play = () => {
      this.tone(notes[this.step % notes.length], 1.8, "triangle", 0.45);
      if (this.step % 4 === 0)
        this.tone(notes[this.step % notes.length] / 2, 3.5, "sine", 0.8);
      this.step++;
    };
    play();
    this.timer = setInterval(play, 650);
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    void this.ctx?.suspend();
  }
  dispose() {
    this.stop();
    void this.ctx?.close();
  }
}
