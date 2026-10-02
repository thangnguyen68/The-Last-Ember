import Phaser from 'phaser';
import { COLORS, CSS, H, W } from '../config';
import { Manifest, setManifest } from '../systems/assets';
import { Platform } from '../systems/platform';
import { BaseScene, text } from '../ui/ui';
import { t } from '../i18n';

export class PreloadScene extends BaseScene {
  constructor() {
    super('Preload');
  }

  preload() {
    this.initCamera();
    const m = this.cache.json.get('manifest') as Manifest;
    setManifest(m);

    this.add.rectangle(W / 2, H / 2, W, H, COLORS.ink);
    text(this, W / 2, H / 2 - 60, t('game.title'), { size: 36, font: 'display' });
    const barBg = this.add.graphics().fillStyle(0x2b3350, 1).fillRoundedRect(60, H / 2, W - 120, 12, 6);
    const bar = this.add.graphics();
    const label = text(this, W / 2, H / 2 + 36, t('preload.loading', { p: 0 }), { size: 14, color: CSS.dim });
    void barBg;

    this.load.on('progress', (p: number) => {
      bar.clear().fillStyle(COLORS.ember, 1).fillRoundedRect(60, H / 2, Math.max(12, (W - 120) * p), 12, 6);
      label.setText(t('preload.loading', { p: Math.round(p * 100) }));
      Platform.setLoadingProgress(p);
    });

    this.load.on('loaderror', (file: Phaser.Loader.File) => console.error('[Load] lỗi tải', file.key, file.src));

    for (const [key, a] of Object.entries(m.assets)) {
      this.load.image(key, a.png);
    }
  }

  create() {
    this.makeGeneratedTextures();
    for (const [key, a] of Object.entries((this.cache.json.get('manifest') as Manifest).animations)) {
      this.anims.create({ key, frames: a.frames.map((f) => ({ key: f })), frameRate: a.fps, repeat: a.loop ? -1 : 0 });
    }
    Platform.setLoadingProgress(1);
    Platform.start().finally(() => this.scene.start('Menu'));
  }

  /** Texture sinh bằng code: lỗ sáng tầm nhìn, chấm hạt. */
  private makeGeneratedTextures() {
    const size = 512;
    const c = this.textures.createCanvas('light_hole', size, size)!;
    const ctx = c.getContext();
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.95)');
    g.addColorStop(0.8, 'rgba(0,0,0,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    c.refresh();

    const glow = this.textures.createCanvas('glow', 128, 128)!;
    const gx = glow.getContext();
    const gg = gx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gg.addColorStop(0, 'rgba(255,220,140,0.9)');
    gg.addColorStop(0.4, 'rgba(255,190,90,0.35)');
    gg.addColorStop(1, 'rgba(255,170,60,0)');
    gx.fillStyle = gg;
    gx.fillRect(0, 0, 128, 128);
    glow.refresh();

    const dot = this.make.graphics({ x: 0, y: 0 }, false);
    dot.fillStyle(0xffffff, 1).fillCircle(8, 8, 8);
    dot.generateTexture('dot', 16, 16);
    dot.destroy();
  }
}
