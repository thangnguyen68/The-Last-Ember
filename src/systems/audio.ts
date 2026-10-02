// Âm thanh placeholder tổng hợp bằng WebAudio (GDD mục 11 – chưa có file âm thanh).
// Khi có file thật, thay phần thân của sfx()/startMusic() bằng this.sound.play(...) của Phaser.
import { Save } from './save';

export type Sfx = 'shard' | 'firefly' | 'jump' | 'slide' | 'hit' | 'mist' | 'out' | 'powerup' | 'rescue' | 'click';

// Ngũ cung (gợi âm hưởng sáo trúc / đàn bầu)
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
const BIOME_ROOT: Record<string, number> = { village: 62, bamboo: 64, terraces: 60, city: 57, mountain: 65, menu: 62, ending: 67 };

class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private step = 0;
  private root = 62;
  private rate = 1;

  /** Phải gọi sau một thao tác chạm của người dùng. */
  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.6;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.18;
      this.musicGain.connect(this.master);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  suspend() {
    this.ctx?.suspend();
  }

  resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, dest?: AudioNode, slideTo?: number, when = 0) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest ?? this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noise(dur: number, vol: number) {
    if (!this.ctx || !this.master) return;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    g.gain.value = vol;
    src.buffer = buf;
    src.connect(f).connect(g).connect(this.master);
    src.start();
  }

  sfx(name: Sfx) {
    if (!Save.data.settings.sound || !this.ctx) return;
    switch (name) {
      case 'shard': this.tone(880, 0.12, 'triangle', 0.25); this.tone(1320, 0.18, 'triangle', 0.2, undefined, undefined, 0.06); break;
      case 'firefly': this.tone(1568, 0.08, 'sine', 0.12); break;
      case 'jump': this.tone(330, 0.2, 'square', 0.08, undefined, 660); break;
      case 'slide': this.noise(0.25, 0.25); break;
      case 'hit': this.tone(160, 0.3, 'sawtooth', 0.25, undefined, 60); this.noise(0.2, 0.35); break;
      case 'mist': this.tone(110, 0.8, 'sine', 0.3, undefined, 70); break;
      case 'out': this.tone(440, 0.9, 'triangle', 0.25, undefined, 110); break;
      case 'powerup': [0, 4, 7, 12].forEach((s, i) => this.tone(523 * Math.pow(2, s / 12), 0.15, 'triangle', 0.2, undefined, undefined, i * 0.06)); break;
      case 'rescue': [0, 7, 12, 16].forEach((s, i) => this.tone(440 * Math.pow(2, s / 12), 0.25, 'sine', 0.2, undefined, undefined, i * 0.08)); break;
      case 'click': this.tone(660, 0.05, 'sine', 0.12); break;
    }
  }

  startMusic(biome: string) {
    this.root = BIOME_ROOT[biome] ?? 62;
    if (this.musicTimer !== null) return;
    this.step = 0;
    const tick = () => {
      this.musicTimer = window.setTimeout(tick, 230 / this.rate);
      if (!Save.data.settings.music || !this.ctx || !this.musicGain || this.ctx.state !== 'running') return;
      const s = this.step++;
      const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
      // Nhịp điện tử nhẹ
      if (s % 4 === 0) this.tone(midi(this.root - 24), 0.25, 'sine', 0.5, this.musicGain, midi(this.root - 30));
      if (s % 8 === 4) this.tone(midi(this.root - 12), 0.12, 'triangle', 0.2, this.musicGain);
      // Giai điệu "sáo"
      if (s % 2 === 0 && Math.random() < 0.7) {
        const n = SCALE[Math.floor(Math.random() * SCALE.length)];
        this.tone(midi(this.root + n), 0.42, 'sine', 0.28, this.musicGain);
      }
    };
    tick();
  }

  setBiome(biome: string) {
    this.root = BIOME_ROOT[biome] ?? this.root;
  }

  setRate(r: number) {
    this.rate = r;
  }

  stopMusic() {
    if (this.musicTimer !== null) clearTimeout(this.musicTimer);
    this.musicTimer = null;
  }
}

export const Audio = new AudioManager();
