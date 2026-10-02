import Phaser from 'phaser';
import {
  BIOME_LENGTH, BIOME_ROAD, clamp, COLORS, CSS, FLAME, fmt, H, lerp, LANTERNS, MIST, PLAYER, POWERUPS,
  ROAD, SPAWN, SPEED, STORY_END_DISTANCE, STORY_THRESHOLDS, VILLAGER, W,
} from '../config';
import { addAsset, applyDef, baseScale, BiomeDef, def, getManifest, lanternAssetFor } from '../systems/assets';
import { Audio } from '../systems/audio';
import { Platform } from '../systems/platform';
import { Save } from '../systems/save';
import { BaseScene, panel, text, toast } from '../ui/ui';
import type { GameMode } from './MenuScene';
import { t } from '../i18n';

type Kind = 'obstacle' | 'shard' | 'firefly' | 'powerup' | 'villager';

interface WorldObj {
  kind: Kind;
  key: string;
  lane: number;
  pos: number;
  sprite: Phaser.GameObjects.Image;
  mul: number;
  /** Độ cao lơ lửng (px ở tỉ lệ 1) */
  float: number;
  done: boolean;
  glow?: Phaser.GameObjects.Image;
  side?: number;
  /** Đã va chạm (vẽ mờ đi) */
  hit?: boolean;
}

interface Reservation { lane: number; from: number; to: number }

export interface RunStats {
  distance: number;
  shards: number;
  fireflies: number;
  villagers: number;
  biomeId: string;
  reason: 'flame' | 'mist' | 'finish';
  mode: GameMode;
  canRevive: boolean;
}

const SHARDS = ['shard_laugh', 'shard_meal', 'shard_promise', 'shard_song', 'shard_letter'];
const PU_KEYS = Object.keys(POWERUPS);
const rnd = Phaser.Math.Between;
const rndf = Phaser.Math.FloatBetween;

export class GameScene extends BaseScene {
  mode: GameMode = 'story';
  private biomes!: BiomeDef[];

  // Trạng thái lượt chơi
  private now = 0;
  private distance = 0;
  private speed = SPEED.start;
  private flame = FLAME.max;
  private mistLevel = 0;
  private calm = 0;
  private shards = 0;
  private fireflies = 0;
  private committedFireflies = 0;
  private villagers = 0;
  private alive = true;
  private reviveUsed = false;
  private biomeIdx = -1;
  private storyShown = new Set<string>();
  private distanceCommitted = 0;

  // Người chơi
  private lane = 0;
  private laneF = 0;
  private laneTween?: Phaser.Tweens.Tween;
  private jumpStart = -1;
  private fallFrom = -1;
  private fallStart = 0;
  private slideStart = -1;
  private height = 0;
  private invulnUntil = 0;
  private slowUntil = 0;
  private effects: Record<string, number> = {};
  private shield = false;

  // Sinh vật thể
  private objs: WorldObj[] = [];
  private reserved: Reservation[] = [];
  private nextRow = 0;
  private nextShard = 0;
  private nextFirefly = 0;
  private nextVillager = 0;
  private nextPowerup = 0;

  // Hiển thị
  private bgA!: Phaser.GameObjects.Image;
  private bgB!: Phaser.GameObjects.Image;
  private road!: Phaser.GameObjects.Graphics;
  private lam!: Phaser.GameObjects.Sprite;
  private lamShadow!: Phaser.GameObjects.Ellipse;
  private lanternGlow!: Phaser.GameObjects.Image;
  private shieldRing!: Phaser.GameObjects.Arc;
  private kiteSprite!: Phaser.GameObjects.Image;
  private vision!: Phaser.GameObjects.RenderTexture;
  private hole!: Phaser.GameObjects.Image;
  private mistImg!: Phaser.GameObjects.Image;
  private bongmo!: Phaser.GameObjects.Image;
  private mistEdge!: Phaser.GameObjects.Graphics;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;

  // HUD
  private flameBar!: Phaser.GameObjects.Graphics;
  private flameIcon!: Phaser.GameObjects.Image;
  private distText!: Phaser.GameObjects.Text;
  private shardText!: Phaser.GameObjects.Text;
  private fireflyText!: Phaser.GameObjects.Text;
  private puIcons: Record<string, { icon: Phaser.GameObjects.Image; arc: Phaser.GameObjects.Graphics }> = {};
  private hurtIcon!: Phaser.GameObjects.Image;

  // Vuốt
  private swipeStart: { x: number; y: number } | null = null;
  private swipeUsed = false;

  constructor() {
    super('Game');
  }

  init(data: { mode?: GameMode }) {
    this.mode = data.mode ?? 'story';
    this.now = 0;
    this.distance = 0;
    this.speed = SPEED.start;
    this.flame = FLAME.max;
    this.mistLevel = 0;
    this.calm = 0;
    this.shards = 0;
    this.fireflies = 0;
    this.committedFireflies = 0;
    this.villagers = 0;
    this.alive = true;
    this.reviveUsed = false;
    this.biomeIdx = -1;
    this.storyShown.clear();
    this.lane = 0;
    this.laneF = 0;
    this.jumpStart = -1;
    this.fallFrom = -1;
    this.slideStart = -1;
    this.height = 0;
    this.invulnUntil = 0;
    this.slowUntil = 0;
    this.effects = {};
    this.shield = false;
    this.objs = [];
    this.reserved = [];
    this.nextRow = SPAWN.safeStart;
    this.nextShard = 20;
    this.nextFirefly = 12;
    this.nextVillager = SPAWN.villagerEvery;
    this.nextPowerup = 150;
    this.puIcons = {};
  }

  create() {
    this.initCamera();
    this.biomes = getManifest().biomes;

    this.bgA = this.add.image(W / 2, 0, this.biomes[0].background).setOrigin(0.5, 0).setDepth(0);
    this.bgB = this.add.image(W / 2, 0, this.biomes[0].background).setOrigin(0.5, 0).setDepth(0).setAlpha(0);
    this.fitBg(this.bgA);
    this.fitBg(this.bgB);
    this.road = this.add.graphics().setDepth(1);

    // Lam
    this.lamShadow = this.add.ellipse(W / 2, ROAD.playerY, 70, 14, 0x000000, 0.35).setDepth(170);
    this.lam = this.add.sprite(W / 2, ROAD.playerY, 'lam_back_01').setDepth(180);
    applyDef(this.lam, 'lam_back_01');
    this.lam.play('lam_run_back');
    this.lanternGlow = this.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(181).setScale(1.2);
    this.shieldRing = this.add.circle(0, 0, 70).setStrokeStyle(4, COLORS.jade, 0.9).setDepth(182).setVisible(false);
    this.kiteSprite = addAsset(this, 0, 0, 'pu_kite', 0.7).setDepth(179).setVisible(false);

    // Tầm nhìn (lớp tối có lỗ sáng)
    this.vision = this.add.renderTexture(0, 0, W, H).setOrigin(0, 0).setDepth(900);
    this.hole = this.make.image({ key: 'light_hole', add: false });

    // Bóng Mờ
    this.mistEdge = this.add.graphics().setDepth(940).setAlpha(0);
    this.drawMistEdge();
    this.bongmo = this.add.image(W / 2, H + 10, 'bongmo_far').setDepth(945).setVisible(false);
    this.mistImg = this.add.image(W / 2, H, 'mist_overlay').setOrigin(0.5, 1).setDepth(950);
    this.mistImg.setDisplaySize(W + 60, 1).setVisible(false);

    this.particles = this.add.particles(0, 0, 'dot', {
      speed: { min: 60, max: 180 },
      scale: { start: 0.5, end: 0 },
      lifespan: 500,
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
      emitting: false,
    }).setDepth(960);

    this.createHud();
    this.setupInput();

    const onBlur = () => this.pauseGame();
    this.game.events.on(Phaser.Core.Events.BLUR, onBlur);
    window.addEventListener('fb-pause', onBlur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, onBlur);
      window.removeEventListener('fb-pause', onBlur);
    });

    Audio.setRate(1);
    Audio.startMusic(this.biomes[0].id);
    this.updateBiome(true);
  }

  // ---------------------------------------------------------------- Hình học đường chạy

  private fitBg(img: Phaser.GameObjects.Image) {
    const s = (ROAD.horizonY + 24) / img.height;
    img.setScale(Math.max(s, W / img.width));
  }

  /** depth: 0 = chân trời, 1 = hàng của Lam (có thể >1 khi vật đã đi qua). */
  private project(z: number) {
    const depth = 1 - z / ROAD.viewDist;
    const y = ROAD.horizonY + depth * (ROAD.playerY - ROAD.horizonY);
    const topW = ROAD.topRight - ROAD.topLeft;
    const w = topW + (ROAD.bottomWidth - topW) * (y - ROAD.horizonY) / (H - ROAD.horizonY);
    const scale = lerp(ROAD.minScale, 1, depth);
    return { depth, y, w, laneW: w / 3, scale };
  }

  private laneX(lane: number, laneW: number) {
    return W / 2 + lane * laneW;
  }

  private get playerLaneW() {
    return this.project(0).laneW;
  }

  // ---------------------------------------------------------------- Điều khiển

  private setupInput() {
    const kb = this.input.keyboard;
    if (kb) {
      kb.on('keydown-LEFT', () => this.moveLane(-1));
      kb.on('keydown-A', () => this.moveLane(-1));
      kb.on('keydown-RIGHT', () => this.moveLane(1));
      kb.on('keydown-D', () => this.moveLane(1));
      kb.on('keydown-UP', () => this.jump());
      kb.on('keydown-W', () => this.jump());
      kb.on('keydown-SPACE', () => this.jump());
      kb.on('keydown-DOWN', () => this.slide());
      kb.on('keydown-S', () => this.slide());
      kb.on('keydown-ESC', () => this.pauseGame());
      kb.on('keydown-P', () => this.pauseGame());
    }

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const x = p.worldX, y = p.worldY;
      if (y < 70 && x < 75) return; // vùng nút tạm dừng
      this.swipeStart = { x: p.x, y: p.y };
      this.swipeUsed = false;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.swipeStart || this.swipeUsed || !p.isDown) return;
      this.trySwipe(p);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.swipeStart && !this.swipeUsed) this.trySwipe(p);
      this.swipeStart = null;
    });
  }

  private trySwipe(p: Phaser.Input.Pointer) {
    if (!this.swipeStart) return;
    const zoom = this.cameras.main.zoom;
    const dx = (p.x - this.swipeStart.x) / zoom;
    const dy = (p.y - this.swipeStart.y) / zoom;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < PLAYER.swipeMin) return;
    this.swipeUsed = true;
    if (Math.abs(dx) > Math.abs(dy)) this.moveLane(dx > 0 ? 1 : -1);
    else if (dy < 0) this.jump();
    else this.slide();
  }

  private moveLane(dir: number) {
    if (!this.alive) return;
    const target = clamp(this.lane + dir, -1, 1);
    if (target === this.lane) return;
    this.lane = target;
    this.laneTween?.stop();
    this.laneTween = this.tweens.add({ targets: this, laneF: target, duration: PLAYER.laneTweenMs, ease: 'Sine.out' });
  }

  private get jumping() {
    return this.jumpStart >= 0 || this.fallFrom >= 0;
  }

  private get sliding() {
    return this.slideStart >= 0;
  }

  private jump() {
    if (!this.alive || this.jumping || this.effects.pu_kite > this.now) return;
    this.slideStart = -1;
    this.jumpStart = this.now;
    Audio.sfx('jump');
  }

  private slide() {
    if (!this.alive || this.effects.pu_kite > this.now) return;
    if (this.jumpStart >= 0) {
      // Rơi nhanh xuống đất rồi trượt
      this.fallFrom = this.height;
      this.fallStart = this.now;
      this.jumpStart = -1;
      return;
    }
    if (this.fallFrom >= 0) return;
    this.slideStart = this.now;
    Audio.sfx('slide');
  }

  private pauseGame() {
    if (!this.alive || !this.scene.isActive()) return;
    this.scene.pause();
    this.scene.launch('Pause', { biome: this.currentBiome().id });
  }

  // ---------------------------------------------------------------- HUD

  private createHud() {
    const D = 1000;
    const pauseBg = this.add.circle(40, 44, 24, 0x141b30, 0.9).setDepth(D);
    const pauseIc = this.add.image(40, 44, 'ic_pause').setDisplaySize(22, 22).setDepth(D + 1);
    pauseBg.setInteractive({ useHandCursor: true }).on('pointerup', () => this.pauseGame());
    void pauseIc;

    panel(this, 76, 23, 298, 42, 21, 0x141b30, 0.9).setDepth(D);
    this.flameIcon = this.add.image(101, 44, 'lantern_lv3').setDepth(D + 1);
    this.flameBar = this.add.graphics().setDepth(D + 1);

    panel(this, 16, 80, 134, 44, 18, 0x141b30, 0.9).setDepth(D);
    this.add.image(36, 102, 'hud_steps').setDisplaySize(20, 20).setDepth(D + 1);
    this.distText = text(this, 52, 102, '0 m', { size: 24, font: 'display', align: 'left' }).setDepth(D + 1);

    panel(this, 226, 80, 70, 44, 18, 0x141b30, 0.9).setDepth(D);
    this.add.image(246, 102, 'hud_shard').setDisplaySize(20, 20).setDepth(D + 1);
    this.shardText = text(this, 284, 102, '0', { size: 24, font: 'display', align: 'right' }).setDepth(D + 1);

    panel(this, 304, 80, 70, 44, 18, 0x141b30, 0.9).setDepth(D);
    this.add.image(323, 102, 'hud_firefly').setDisplaySize(20, 20).setDepth(D + 1);
    this.fireflyText = text(this, 362, 102, '0', { size: 24, font: 'display', align: 'right' }).setDepth(D + 1);

    this.hurtIcon = addAsset(this, 350, 210, 'lam_hurt', 0.5).setDepth(D + 2).setVisible(false);
  }

  private updateHud() {
    const pct = this.flame / FLAME.max;
    const x = 124, y = 38, w = 236, h = 12;
    this.flameBar.clear();
    this.flameBar.fillStyle(0x2f3a5e, 1).fillRoundedRect(x, y, w, h, 6);
    if (pct > 0) {
      const col = pct < 0.33 ? COLORS.emberDark : COLORS.ember;
      this.flameBar.fillStyle(col, 1).fillRoundedRect(x, y, Math.max(h, w * pct), h, 6);
    }
    const lk = lanternAssetFor(Math.ceil(this.flame));
    if (this.flameIcon.texture.key !== lk) this.flameIcon.setTexture(lk);
    this.flameIcon.setScale(baseScale(this, lk) * 0.24);

    this.distText.setText(`${fmt(this.distance)} m`);
    this.shardText.setText(String(this.shards));
    this.fireflyText.setText(String(this.fireflies));

    // Vật phẩm đang có hiệu lực
    let i = 0;
    for (const key of PU_KEYS) {
      const active = key === 'pu_shield' ? this.shield : (this.effects[key] ?? 0) > this.now;
      let ui = this.puIcons[key];
      if (!active) {
        if (ui) { ui.icon.destroy(); ui.arc.destroy(); delete this.puIcons[key]; }
        continue;
      }
      if (!ui) {
        ui = {
          icon: this.add.image(0, 0, key).setDisplaySize(28, 28).setDepth(1001),
          arc: this.add.graphics().setDepth(1001),
        };
        this.puIcons[key] = ui;
      }
      const cx = 36 + i * 44, cy = 152;
      ui.icon.setPosition(cx, cy);
      ui.arc.clear();
      ui.arc.fillStyle(0x141b30, 0.85).fillCircle(cx, cy, 19);
      const dur = POWERUPS[key].durationMs;
      const left = dur ? clamp((this.effects[key] - this.now) / dur, 0, 1) : 1;
      ui.arc.lineStyle(3, COLORS.ember, 1);
      ui.arc.beginPath();
      ui.arc.arc(cx, cy, 19, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left, false);
      ui.arc.strokePath();
      ui.icon.setDepth(1002);
      i++;
    }
  }

  // ---------------------------------------------------------------- Vòng lặp

  update(_t: number, deltaMs: number) {
    const dtMs = Math.min(deltaMs, 50);
    const dt = dtMs / 1000;
    if (this.alive) {
      this.now += dtMs;
      this.step(dt);
    }
    this.render();
  }

  private step(dt: number) {
    // Tốc độ
    const loop = Math.floor(this.distance / (BIOME_LENGTH * this.biomes.length));
    const max = this.mode === 'endless' ? Math.min(SPEED.endlessMaxCap, SPEED.max + loop * SPEED.endlessMaxPerLoop) : SPEED.max;
    this.speed = Math.min(max, this.speed + SPEED.accel * dt);
    const eff = this.speed * (this.slowUntil > this.now ? SPEED.slowFactor : 1);
    const prevDist = this.distance;
    this.distance += eff * dt;

    // Chế độ câu chuyện: tới đỉnh Núi Rạng
    if (this.mode === 'story' && this.distance >= STORY_END_DISTANCE) {
      this.finishStory();
      return;
    }
    this.updateBiome(false);

    // Ngọn lửa
    const lantern = LANTERNS[Save.data.equippedLantern] ?? LANTERNS.lantern_up1;
    if (this.effects.pu_boost > this.now) this.flame = FLAME.max;
    else this.flame -= FLAME.decayPerSec * lantern.decayMul * dt;
    if (this.flame <= 0) {
      this.flame = 0;
      this.die('flame');
      return;
    }

    // Bóng Mờ dịu dần nếu không va chạm
    if (this.mistLevel > 0) {
      this.calm += dt;
      if (this.calm >= MIST.calmSecToDrop) {
        this.calm = 0;
        this.setMist(this.mistLevel - 1);
      }
    }

    // Nhảy / trượt / diều
    if (this.jumpStart >= 0) {
      const t = (this.now - this.jumpStart) / PLAYER.jumpMs;
      if (t >= 1) { this.jumpStart = -1; this.height = 0; }
      else this.height = Math.sin(Math.PI * t) * PLAYER.jumpHeight;
    } else if (this.fallFrom >= 0) {
      const t = (this.now - this.fallStart) / 110;
      if (t >= 1) {
        this.fallFrom = -1;
        this.height = 0;
        this.slideStart = this.now;
        Audio.sfx('slide');
      } else this.height = this.fallFrom * (1 - t);
    } else if (this.effects.pu_kite > this.now) {
      const left = this.effects.pu_kite - this.now;
      const target = left < 400 ? 90 * (left / 400) : 90;
      this.height = lerp(this.height, target, Math.min(1, dt * 8));
    } else {
      this.height = Math.max(0, this.height - dt * 400);
    }
    if (this.slideStart >= 0 && this.now - this.slideStart >= PLAYER.slideMs) this.slideStart = -1;

    this.generate();
    this.checkObjects(prevDist);
  }

  // ---------------------------------------------------------------- Vùng đất

  private currentBiome() {
    return this.biomeAt(this.distance);
  }

  private biomeAt(pos: number) {
    const idx = Math.floor(pos / BIOME_LENGTH);
    return this.biomes[Math.min(this.mode === 'story' ? this.biomes.length - 1 : Infinity, idx) % this.biomes.length];
  }

  private updateBiome(force: boolean) {
    const idx = Math.floor(this.distance / BIOME_LENGTH);
    if (idx === this.biomeIdx && !force) return;
    this.biomeIdx = idx;
    const b = this.currentBiome();
    if (force) {
      this.bgA.setTexture(b.background);
      this.fitBg(this.bgA);
    } else {
      // Mờ dần hình nền 1 giây
      this.bgB.setTexture(b.background).setAlpha(0);
      this.fitBg(this.bgB);
      this.tweens.add({
        targets: this.bgB, alpha: 1, duration: 1000,
        onComplete: () => {
          this.bgA.setTexture(b.background);
          this.fitBg(this.bgA);
          this.bgB.setAlpha(0);
        },
      });
    }
    Audio.setBiome(b.id);
    const banner = text(this, W / 2, 300, t(`biome.${b.id}`), { size: 44, font: 'display' }).setDepth(1100).setAlpha(0);
    const loop = Math.floor(idx / this.biomes.length);
    if (this.mode === 'endless' && loop > 0) banner.setText(t('game.loop', { name: t(`biome.${b.id}`), n: loop + 1 }));
    this.tweens.add({ targets: banner, alpha: 1, duration: 300 });
    this.tweens.add({ targets: banner, alpha: 0, delay: 1700, duration: 300, onComplete: () => banner.destroy() });
  }

  // ---------------------------------------------------------------- Sinh vật thể

  private isReserved(lane: number, from: number, to: number) {
    return this.reserved.some((r) => r.lane === lane && r.to >= from && r.from <= to);
  }

  private generate() {
    const frontier = this.distance + ROAD.viewDist;
    this.reserved = this.reserved.filter((r) => r.to > this.distance - 5);

    for (let guard = 0; guard < 20; guard++) {
      const next = Math.min(this.nextRow, this.nextShard, this.nextFirefly, this.nextVillager, this.nextPowerup);
      if (next > frontier) break;
      if (next === this.nextPowerup) {
        this.spawnPowerup(next);
        this.nextPowerup += SPAWN.powerupEvery + rnd(-40, 40);
      } else if (next === this.nextShard) {
        this.spawnChain(next, 'shard');
        this.nextShard += SPAWN.shardEvery + rnd(-10, 10);
      } else if (next === this.nextFirefly) {
        this.spawnChain(next, 'firefly');
        this.nextFirefly += SPAWN.fireflyEvery + rnd(-5, 5);
      } else if (next === this.nextVillager) {
        this.spawnVillager(next);
        this.nextVillager += SPAWN.villagerEvery + rnd(-30, 30);
      } else {
        this.spawnRow(next);
        this.nextRow += rnd(SPAWN.rowMin, SPAWN.rowMax);
      }
    }
  }

  private makeObj(kind: Kind, key: string, lane: number, pos: number, mul: number, float = 0): WorldObj {
    const sprite = this.add.image(0, -500, key);
    applyDef(sprite, key);
    const o: WorldObj = { kind, key, lane, pos, sprite, mul, float, done: false };
    if (kind === 'shard' || kind === 'powerup') {
      o.glow = this.add.image(0, -500, 'glow').setBlendMode(Phaser.BlendModes.ADD);
    }
    this.objs.push(o);
    return o;
  }

  private spawnRow(pos: number) {
    const biome = this.biomeAt(pos);
    const difficulty = clamp(this.distance / 3000, 0, 1);
    const count = Math.random() < 0.25 + difficulty * 0.45 ? 2 : 1;
    const lanes = Phaser.Utils.Array.Shuffle([-1, 0, 1]).filter((l) => !this.isReserved(l, pos - 3, pos + 3));
    for (let i = 0; i < Math.min(count, lanes.length, 2); i++) {
      const key = Phaser.Utils.Array.GetRandom(biome.obstacles) as string;
      const o = this.makeObj('obstacle', key, lanes[i], pos, 0.85);
      this.reserved.push({ lane: lanes[i], from: pos - 2, to: pos + 2 });
      void o;
    }
  }

  private spawnChain(pos: number, kind: 'shard' | 'firefly') {
    const n = kind === 'shard' ? rnd(SPAWN.shardChainMin, SPAWN.shardChainMax) : rnd(SPAWN.fireflyChainMin, SPAWN.fireflyChainMax);
    const end = pos + (n - 1) * SPAWN.itemGap;
    const lanes = [-1, 0, 1].filter((l) => !this.isReserved(l, pos - 2, end + 2));
    if (!lanes.length) return;
    const lane = Phaser.Utils.Array.GetRandom(lanes) as number;
    this.reserved.push({ lane, from: pos - 2, to: end + 2 });
    const key = kind === 'shard' ? (Phaser.Utils.Array.GetRandom(SHARDS) as string) : 'firefly';
    for (let i = 0; i < n; i++) {
      // Đom đóm bay lượn theo hình sóng
      const float = kind === 'firefly' ? 30 + Math.sin(i * 0.9) * 14 : 26;
      this.makeObj(kind, key, lane, pos + i * SPAWN.itemGap, kind === 'shard' ? 0.42 : 0.38, float);
    }
  }

  private spawnPowerup(pos: number) {
    const lanes = [-1, 0, 1].filter((l) => !this.isReserved(l, pos - 3, pos + 3));
    if (!lanes.length) return;
    const lane = Phaser.Utils.Array.GetRandom(lanes) as number;
    this.reserved.push({ lane, from: pos - 3, to: pos + 3 });
    const key = Phaser.Utils.Array.GetRandom(PU_KEYS) as string;
    this.makeObj('powerup', key, lane, pos, 0.45, 34);
  }

  private spawnVillager(pos: number) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const o = this.makeObj('villager', 'villager_stone', side * 1.85, pos, 0.75);
    o.side = side;
  }

  // ---------------------------------------------------------------- Va chạm & nhặt

  private checkObjects(prevDist: number) {
    const magnet = this.effects.pu_magnet > this.now;
    for (const o of this.objs) {
      if (o.done) continue;
      const z = o.pos - this.distance;
      const zPrev = o.pos - prevDist;

      if (magnet && (o.kind === 'shard' || o.kind === 'firefly') && z < 14) {
        o.lane = lerp(o.lane, this.laneF, Math.min(1, 0.12 + (14 - z) / 30));
      }

      if (o.kind === 'obstacle') {
        if (zPrev > 0 && z <= 0 && Math.abs(this.laneF - o.lane) < 0.5) this.hitObstacle(o);
        else if (z <= 0) o.done = true;
      } else if (o.kind === 'villager') {
        if (zPrev > 0 && z <= 0) {
          o.done = true;
          if (this.lane === o.side) this.tryRescue(o);
        }
      } else if (zPrev > 0.6 && z <= 0.6 || (z <= 0.6 && z > -0.6 && !o.done)) {
        if (Math.abs(this.laneF - o.lane) < 0.55) this.collect(o);
        else if (z <= -0.6) o.done = true;
      }
    }
  }

  private hitObstacle(o: WorldObj) {
    o.done = true;
    const action = def(o.key).action ?? 'lane';
    if (this.effects.pu_kite > this.now) return;
    if (action === 'jump' && this.height > PLAYER.clearHeight) return;
    if (action === 'slide' && this.sliding) return;
    if (action === 'slow') {
      if (this.height > PLAYER.clearHeight) return;
      this.slowUntil = this.now + SPEED.slowMs;
      this.cameras.main.shake(120, 0.003);
      return;
    }
    if (this.invulnUntil > this.now) return;
    this.invulnUntil = this.now + PLAYER.invulnMs;

    if (this.shield) {
      this.shield = false;
      Audio.sfx('powerup');
      this.particles.setParticleTint(COLORS.jade);
      this.particles.explode(20, this.lam.x, this.lam.y - 70);
      return;
    }

    Audio.sfx('hit');
    this.cameras.main.shake(220, 0.008);
    this.flame -= FLAME.hitDamage;
    this.calm = 0;
    this.setMist(this.mistLevel + 1);
    this.hurtIcon.setVisible(true);
    this.time.delayedCall(PLAYER.hurtIconMs, () => this.hurtIcon.setVisible(false));
    o.hit = true;

    if (this.mistLevel >= 3) this.die('mist');
    else if (this.flame <= 0) { this.flame = 0; this.die('flame'); }
  }

  private collect(o: WorldObj) {
    o.done = true;
    const x = o.sprite.x, y = o.sprite.y;
    const doubled = this.effects.pu_double > this.now;
    if (o.kind === 'shard') {
      this.shards++;
      this.flame = Math.min(FLAME.max, this.flame + FLAME.shardGain);
      Audio.sfx('shard');
      this.particles.setParticleTint(COLORS.shard);
      this.particles.explode(10, x, y);
      this.trackStory();
    } else if (o.kind === 'firefly') {
      this.fireflies += doubled ? 2 : 1;
      Audio.sfx('firefly');
      this.particles.setParticleTint(COLORS.firefly);
      this.particles.explode(5, x, y);
    } else if (o.kind === 'powerup') {
      Audio.sfx('powerup');
      this.particles.setParticleTint(COLORS.ember);
      this.particles.explode(18, x, y);
      if (o.key === 'pu_shield') this.shield = true;
      else this.effects[o.key] = this.now + POWERUPS[o.key].durationMs;
      if (o.key === 'pu_kite') { this.jumpStart = -1; this.fallFrom = -1; this.slideStart = -1; }
      toast(this, t(`pu.${o.key}`), 250, CSS.shard);
    }
    o.sprite.setVisible(false);
    o.glow?.setVisible(false);
  }

  private tryRescue(o: WorldObj) {
    if (this.flame < VILLAGER.minFlame) {
      toast(this, t('game.needFlame', { n: VILLAGER.minFlame }), 250, CSS.mist);
      return;
    }
    this.flame -= VILLAGER.flameCost;
    const reward = VILLAGER.reward * (this.effects.pu_double > this.now ? 2 : 1);
    this.fireflies += reward;
    this.villagers++;
    Audio.sfx('rescue');
    o.sprite.clearTint().setTint(0xffe2b0);
    this.particles.setParticleTint(COLORS.ember);
    this.particles.explode(30, o.sprite.x, o.sprite.y - 60);
    toast(this, t('game.rescued', { n: reward }), 250, CSS.firefly);
  }

  private trackStory() {
    const b = this.currentBiome();
    const s = Save.data;
    s.biomeShards[b.id] = (s.biomeShards[b.id] ?? 0) + 1;
    const total = s.biomeShards[b.id];
    const unlocked = STORY_THRESHOLDS.filter((t) => total >= t).length;
    if (unlocked > (s.storyUnlocked[b.id] ?? 0)) {
      s.storyUnlocked[b.id] = unlocked;
      Save.write();
      toast(this, t('game.storyUnlocked'), 250, CSS.shard);
    }
  }

  private setMist(level: number) {
    const prev = this.mistLevel;
    this.mistLevel = clamp(level, 0, 3);
    if (this.mistLevel > prev) Audio.sfx('mist');
    const lv = Math.min(this.mistLevel, 2);
    const hgt = MIST.overlayHeights[this.mistLevel];
    this.mistImg.setVisible(this.mistLevel > 0);
    this.tweens.add({ targets: this.mistImg, displayHeight: Math.max(1, hgt), duration: 400 });
    if (lv === 0) this.bongmo.setVisible(false);
    else {
      const key = lv === 1 ? 'bongmo_far' : 'bongmo_near';
      this.bongmo.setTexture(key).setVisible(true);
      applyDef(this.bongmo, key, lv === 1 ? 0.6 : 1.1);
      this.bongmo.setPosition(W / 2, H - hgt * 0.4 + 30);
    }
    this.tweens.add({ targets: this.mistEdge, alpha: this.mistLevel >= 2 ? 1 : 0, duration: 500 });
    Audio.setRate(this.mistLevel >= 2 ? MIST.musicSlow : 1);
  }

  private drawMistEdge() {
    const g = this.mistEdge;
    const steps = 10;
    for (let i = 0; i < steps; i++) {
      g.lineStyle(6, COLORS.mist, 0.35 * (1 - i / steps));
      g.strokeRect(i * 6, i * 6, W - i * 12, H - i * 12);
    }
  }

  // ---------------------------------------------------------------- Kết thúc lượt

  private die(reason: 'flame' | 'mist') {
    if (!this.alive) return;
    this.alive = false;
    Audio.sfx(reason === 'flame' ? 'out' : 'mist');
    this.lam.stop();
    this.lam.setTexture('lam_hurt');
    applyDef(this.lam, 'lam_hurt');
    if (reason === 'mist') {
      this.bongmo.setTexture('bongmo_near').setVisible(true);
      this.tweens.add({ targets: this.bongmo, y: H - 80, scale: this.bongmo.scale * 1.4, duration: 600 });
      this.tweens.add({ targets: this.mistImg, displayHeight: 360, duration: 600 });
    }
    this.commitRun();
    this.time.delayedCall(800, () => {
      this.scene.pause();
      this.scene.launch('GameOver', this.stats(reason));
    });
  }

  private stats(reason: RunStats['reason']): RunStats {
    return {
      distance: this.distance,
      shards: this.shards,
      fireflies: this.fireflies,
      villagers: this.villagers,
      biomeId: this.currentBiome().id,
      reason,
      mode: this.mode,
      canRevive: !this.reviveUsed,
    };
  }

  /** Cộng đom đóm, kỷ lục và thống kê vào bản lưu (gọi khi thua / kết thúc). */
  private commitRun() {
    const s = Save.data;
    const gained = this.fireflies - this.committedFireflies;
    this.committedFireflies = this.fireflies;
    s.fireflies += gained;
    const prevBest = s.bestDistance;
    s.bestDistance = Math.max(s.bestDistance, Math.floor(this.distance));
    s.stats.runs += this.reviveUsed ? 0 : 1;
    s.stats.totalDistance += Math.floor(this.distance);
    s.stats.villagersSaved += this.villagers;
    s.stats.shards += this.shards;
    // Tránh cộng trùng nếu hồi sinh rồi thua tiếp
    this.distanceCommitted = this.distance;
    Save.write();
    if (s.bestDistance > prevBest) Platform.submitScore(s.bestDistance);
  }

  /** Gọi từ GameOverScene khi người chơi thắp lại. */
  revive() {
    this.reviveUsed = true;
    this.alive = true;
    this.flame = FLAME.reviveFlame;
    this.setMist(0);
    this.calm = 0;
    this.invulnUntil = this.now + 2000;
    // Trừ phần thống kê đã cộng để lần commit sau không bị đếm trùng
    const s = Save.data;
    s.stats.totalDistance -= Math.floor(this.distanceCommitted);
    s.stats.villagersSaved -= this.villagers;
    s.stats.shards -= this.shards;
    for (const o of this.objs) {
      if (o.kind === 'obstacle' && o.pos - this.distance < 20) {
        o.done = true;
        o.sprite.setVisible(false);
      }
    }
    this.lam.play('lam_run_back');
    applyDef(this.lam, 'lam_back_01');
    this.tweens.add({ targets: this.mistImg, displayHeight: 1, duration: 300 });
    this.particles.setParticleTint(COLORS.ember);
    this.particles.explode(40, this.lam.x, this.lam.y - 80);
  }

  private finishStory() {
    this.alive = false;
    this.distance = STORY_END_DISTANCE;
    this.commitRun();
    this.cameras.main.fadeOut(900, 255, 240, 210);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Ending', this.stats('finish'));
    });
  }

  // ---------------------------------------------------------------- Vẽ

  private render() {
    const biome = this.currentBiome();
    const col = BIOME_ROAD[biome.id] ?? BIOME_ROAD.village;
    const g = this.road;
    g.clear();

    // Hai bên đường
    g.fillStyle(col.side, 1).fillRect(0, ROAD.horizonY, W, H - ROAD.horizonY);
    // Mặt đường (hình thang)
    g.fillStyle(col.road, 1);
    g.fillPoints([
      { x: ROAD.topLeft, y: ROAD.horizonY }, { x: ROAD.topRight, y: ROAD.horizonY },
      { x: W / 2 + ROAD.bottomWidth / 2, y: H }, { x: W / 2 - ROAD.bottomWidth / 2, y: H },
    ], true);

    // Vạch chia làn chuyển động
    g.fillStyle(col.dash, 0.75);
    const period = 4, dash = 1.6;
    const off = this.distance % period;
    for (let k = -3; k * period < ROAD.viewDist + period; k++) {
      const z0 = k * period - off;
      const z1 = z0 + dash;
      if (z1 < -10 || z0 > ROAD.viewDist) continue;
      const a = this.project(Math.min(z1, ROAD.viewDist));
      const b = this.project(Math.max(z0, -10));
      for (const lb of [-0.5, 0.5]) {
        const wa = 1 + a.scale * 2.5, wb = 1 + b.scale * 2.5;
        g.fillPoints([
          { x: this.laneX(lb, a.laneW) - wa, y: a.y }, { x: this.laneX(lb, a.laneW) + wa, y: a.y },
          { x: this.laneX(lb, b.laneW) + wb, y: b.y }, { x: this.laneX(lb, b.laneW) - wb, y: b.y },
        ], true);
      }
    }
    // Sương ở chân trời
    g.fillGradientStyle(0x8a90a8, 0x8a90a8, col.road, col.road, 0.35, 0.35, 0, 0);
    g.fillRect(0, ROAD.horizonY - 6, W, 50);

    // Hình nền xê dịch nhẹ theo làn
    const bx = W / 2 - this.laneF * 10;
    this.bgA.x = bx;
    this.bgB.x = bx;

    // Vật thể
    const t = this.now / 1000;
    this.objs = this.objs.filter((o) => {
      const z = o.pos - this.distance;
      if (z < -9) {
        o.sprite.destroy();
        o.glow?.destroy();
        return false;
      }
      if (z > ROAD.viewDist) {
        o.sprite.setVisible(false);
        o.glow?.setVisible(false);
        return true;
      }
      const p = this.project(z);
      const bob = o.kind === 'obstacle' || o.kind === 'villager' ? 0 : Math.sin(t * 4 + o.pos) * 4;
      const x = this.laneX(o.lane, p.laneW);
      const y = p.y - (o.float + bob) * p.scale;
      const visible = !(o.done && o.kind !== 'obstacle' && o.kind !== 'villager');
      o.sprite.setVisible(visible).setPosition(x, y);
      o.sprite.setScale(baseScale(this, o.key) * o.mul * p.scale);
      o.sprite.setAlpha(clamp(p.depth / 0.12, 0, 1) * (o.hit ? 0.4 : 1));
      o.sprite.setDepth(100 + p.y / 10);
      if (o.glow) {
        o.glow.setVisible(visible).setPosition(x, y).setScale(p.scale * 0.8).setDepth(99 + p.y / 10);
      }
      return true;
    });

    // Lam
    const lw = this.playerLaneW;
    const lx = this.laneX(this.laneF, lw);
    const air = this.height;
    const kite = this.effects.pu_kite > this.now;
    const inJumpPose = this.jumping && this.alive;
    const wantKey = !this.alive ? 'lam_hurt' : inJumpPose ? 'lam_jump' : null;
    if (wantKey && this.lam.texture.key !== wantKey) {
      this.lam.stop();
      this.lam.setTexture(wantKey);
    } else if (!wantKey && !this.lam.anims.isPlaying) {
      this.lam.play('lam_run_back');
    }
    applyDef(this.lam, wantKey ?? 'lam_back_01');
    if (this.sliding && this.alive) this.lam.scaleY *= 0.6;
    this.lam.setPosition(lx, ROAD.playerY - air);
    const blink = this.invulnUntil > this.now && this.alive && Math.floor(this.now / 80) % 2 === 0;
    this.lam.setAlpha(blink ? 0.35 : 1);
    this.lamShadow.setPosition(lx, ROAD.playerY).setScale(1 - air / 300);

    const lanternX = lx + 26, lanternY = ROAD.playerY - air - (this.sliding ? 42 : 66);
    const pulse = 1 + Math.sin(t * 6) * 0.05;
    this.lanternGlow.setPosition(lanternX, lanternY).setScale((0.6 + this.flame / 100) * pulse).setAlpha(this.flame > 0 ? 0.9 : 0);
    this.shieldRing.setVisible(this.shield).setPosition(lx, ROAD.playerY - air - 75);
    this.kiteSprite.setVisible(kite).setPosition(lx, ROAD.playerY - air - 175).setAngle(Math.sin(t * 3) * 8);

    // Tầm nhìn
    const lantern = LANTERNS[Save.data.equippedLantern] ?? LANTERNS.lantern_up1;
    const r = lerp(FLAME.visionMin + lantern.visionBonus, FLAME.visionMax, this.flame / FLAME.max) * pulse;
    this.vision.clear();
    this.vision.fill(0x05070f, 0.88);
    this.hole.setPosition(lanternX - 20, lanternY - 40).setScale(r / (256 * 0.62));
    this.vision.erase(this.hole);

    if (this.bongmo.visible && this.alive) this.bongmo.x = W / 2 + Math.sin(t * 1.5) * 20;

    this.updateHud();
  }
}
