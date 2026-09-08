// Offline additive electric-grand synthesis: decaying partials, short hammer attack,
// a low-pass stage, gentle stereo delay and a limiter. No sample/network dependency.
export class PianoAudio {
  private generation = 0;
  private context?: AudioContext;
  private master?: GainNode;
  private dry?: GainNode;
  private active: { osc: OscillatorNode; gain: GainNode }[] = [];
  volume = 0.65;
  sustain = true;
  arpeggiate = false;
  async ready() {
    if (!this.context) {
      const ctx = (this.context = new AudioContext());
      const master = (this.master = ctx.createGain());
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.ratio.value = 5;
      master.connect(compressor);
      compressor.connect(ctx.destination);
      const dry = (this.dry = ctx.createGain());
      dry.connect(master);
      const delay = ctx.createDelay();
      delay.delayTime.value = 0.19;
      const wet = ctx.createGain();
      wet.gain.value = 0.12;
      dry.connect(delay);
      delay.connect(wet);
      wet.connect(master);
      master.gain.value = this.volume;
    }
    await this.context.resume();
  }
  setVolume(v: number) {
    this.volume = v;
    if (this.master && this.context)
      this.master.gain.setTargetAtTime(v, this.context.currentTime, 0.02);
  }
  async play(notes: number[], duration = 1.8) {
    this.stop();
    const generation = this.generation;
    await this.ready();
    if (generation !== this.generation) return;
    const ctx = this.context!;
    const time = ctx.currentTime;
    const scale = 0.19 / Math.sqrt(Math.max(1, notes.length));
    const decay = this.sustain ? Math.max(1.5, duration + 1.2) : 0.55;
    notes.forEach((midi, i) => {
      const start = time + (this.arpeggiate ? i * 0.065 : 0);
      const frequency = 440 * 2 ** ((midi - 69) / 12);
      [1, 2, 3, 4, 5, 7].forEach((partial, j) => {
        if (frequency * partial > 15000) return;
        const osc = ctx.createOscillator(),
          gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = frequency * partial * (1 + (partial > 1 ? partial * 0.00015 : 0));
        const amplitude = scale * [1, 0.4, 0.19, 0.08, 0.045, 0.015][j];
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(amplitude, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.00001, amplitude * 0.32), start + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.00001, start + decay / (1 + j * 0.23));
        osc.connect(gain);
        gain.connect(this.dry!);
        osc.start(start);
        osc.stop(start + decay + 0.1);
        const node = { osc, gain };
        this.active.push(node);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
          this.active = this.active.filter((n) => n !== node);
        };
      });
    });
  }
  stop() {
    this.generation++;
    if (!this.context) return;
    const now = this.context.currentTime;
    for (const { osc, gain } of this.active) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0, now, 0.015);
      try {
        osc.stop(now + 0.08);
      } catch {
        /* already stopped */
      }
    }
    this.active = [];
  }
}
export const pianoAudio = new PianoAudio();
