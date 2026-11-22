import { gameAudio, validateGameAudio, type GameAudio } from "./game-audio";
// Original procedural glass-and-strings sketch. No samples or external recordings.
export class AudioScore {
  ctx: AudioContext | null = null;
  timer: ReturnType<typeof setInterval> | null = null;
  step = 0;
  private generation = 0;
  private disposed = false;
  volume: number;
  source: GameAudio;
  constructor(source = gameAudio()) {
    this.source = validateGameAudio(source);
    this.volume = this.source.volume;
  }
  feedback(kind: "skill" | "move") {
    this.tone(
      kind === "skill" ? this.source.skillHz : this.source.moveHz,
      this.source.feedbackMs / 1000,
      "triangle",
      this.source.feedbackGain,
    );
  }
  tone(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    gain = 0.15,
  ) {
    if (!this.ctx || this.disposed || gain * this.volume <= 0) return;
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
    if (this.disposed || !this.source.enabled) return;
    const generation = ++this.generation;
    if (!this.ctx) this.ctx = new AudioContext();
    await this.ctx.resume();
    if (this.disposed || generation !== this.generation) return;
    if (this.timer) return;
    const notes = this.source.notes;
    const play = () => {
      this.tone(
        notes[this.step % notes.length],
        this.source.noteMs / 1000,
        this.source.waveform,
        this.source.leadGain,
      );
      if (this.step % 4 === 0)
        this.tone(
          notes[this.step % notes.length] / 2,
          this.source.bassMs / 1000,
          "sine",
          this.source.bassGain,
        );
      this.step++;
    };
    play();
    this.timer = setInterval(play, this.source.stepMs);
  }
  stop() {
    this.generation++;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.ctx?.state !== "closed") void this.ctx?.suspend().catch(() => {});
  }
  dispose() {
    this.disposed = true;
    this.stop();
    if (this.ctx?.state !== "closed") void this.ctx?.close().catch(() => {});
  }
}
