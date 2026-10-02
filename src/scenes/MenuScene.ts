import Phaser from 'phaser';
import { COLORS, CSS, fmt, H, W } from '../config';
import { addAsset } from '../systems/assets';
import { Audio } from '../systems/audio';
import { Platform } from '../systems/platform';
import { Save } from '../systems/save';
import { BaseScene, Button, panel, roundButton, starryBackground, text } from '../ui/ui';
import { getLang, LANGS, setLang, t } from '../i18n';

export type GameMode = 'story' | 'endless';

export class MenuScene extends BaseScene {
  private mode: GameMode = 'story';

  constructor() {
    super('Menu');
  }

  create() {
    this.initCamera();
    starryBackground(this);
    this.drawScenery();

    // Số đom đóm góc phải trên
    panel(this, 286, 24, 86, 46, 23, 0x141b30, 0.95);
    this.add.image(310, 47, 'hud_firefly').setDisplaySize(22, 22);
    text(this, 352, 47, fmt(Save.data.fireflies), { size: 22, font: 'display' }).setOrigin(1, 0.5);

    const name = Platform.playerName();
    if (name) text(this, 20, 82, t('menu.hello', { name }), { size: 14, color: CSS.dim, align: 'left' });

    // Logo
    text(this, W / 2, 146, t('game.title1'), { size: 64, font: 'display' });
    text(this, W / 2, 206, t('game.title2'), { size: 64, font: 'display' });

    // Chọn ngôn ngữ nhanh (EN / VI)
    LANGS.forEach((l, i) => {
      const x = 38 + i * 48;
      const active = getLang() === l;
      const g = this.add.graphics();
      g.fillStyle(active ? COLORS.ember : 0x141b30, active ? 1 : 0.95).fillRoundedRect(x - 21, 31, 42, 32, 16);
      const lbl = text(this, x, 47, l.toUpperCase(), { size: 14, font: 'bold', color: active ? CSS.ink : CSS.paper });
      lbl.setInteractive(new Phaser.Geom.Rectangle(-6, -4, lbl.width + 12, lbl.height + 8), Phaser.Geom.Rectangle.Contains)
        .on('pointerup', () => {
          Audio.unlock();
          Audio.sfx('click');
          if (!active) { setLang(l); this.scene.restart(); }
        });
    });

    // Lam đứng cầm đèn
    const lam = addAsset(this, 200, 582, 'lam_idle', 1.45);
    const glow = this.add.image(lam.x + 48, lam.y - 88, 'glow').setScale(1.1).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, scale: 1.3, alpha: 0.7, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: lam, y: lam.y - 3, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // Chế độ chơi
    const modeText = text(this, W / 2, 612, '', { size: 15, color: CSS.dim });
    const refreshMode = () => modeText.setText(t('menu.mode', { mode: t(this.mode === 'story' ? 'mode.story' : 'mode.endless') }));
    refreshMode();
    modeText.setInteractive({ useHandCursor: true }).on('pointerup', () => {
      Audio.unlock();
      Audio.sfx('click');
      this.mode = this.mode === 'story' ? 'endless' : 'story';
      refreshMode();
    });

    new Button(this, W / 2, 662, { w: 342, h: 64, label: t('menu.start'), size: 32 }, () => {
      this.scene.start('Game', { mode: this.mode });
    });

    // Dải dưới
    roundButton(this, 55, 748, 'ic_shop', t('menu.shop'), () => this.scene.start('Shop'));
    roundButton(this, 147, 748, 'ic_map', t('menu.journey'), () => this.scene.start('Journey'));
    roundButton(this, 243, 748, 'ic_trophy', t('menu.achievements'), () => this.scene.start('Achievements'));
    roundButton(this, 336, 748, 'ic_settings', t('menu.settings'), () => this.scene.start('Settings'));

    if (Save.data.bestDistance > 0) {
      text(this, W / 2, 820, t('menu.best', { d: fmt(Save.data.bestDistance) }), { size: 13, color: CSS.dim });
    }

    Audio.setRate(1);
    Audio.startMusic('menu');
    Audio.setBiome('menu');
  }

  private drawScenery() {
    const g = this.add.graphics();
    // Đồi
    g.fillStyle(0x18203a, 1);
    g.beginPath();
    g.moveTo(0, 338); g.lineTo(168, 304); g.lineTo(366, 366); g.lineTo(W, 400); g.lineTo(W, 540); g.lineTo(0, 540);
    g.closePath(); g.fillPath();
    // Hải đăng
    g.fillStyle(0x863a3a, 1).fillTriangle(192, 276, 228, 242, 264, 276);
    g.fillStyle(0x25294a, 1).fillRect(203, 276, 50, 40);
    g.fillStyle(0x9a9a9a, 1).fillPoints([{ x: 203, y: 316 }, { x: 253, y: 316 }, { x: 264, y: 540 }, { x: 192, y: 540 }], true);
    g.fillStyle(0x863a3a, 1).fillRect(200, 366, 60, 33);
    g.fillStyle(0x863a3a, 1).fillRect(197, 440, 66, 28);
    const beam = this.add.image(228, 296, 'glow').setScale(0.6).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: beam, alpha: 0.3, duration: 1600, yoyo: true, repeat: -1 });
    // Mặt đất
    g.fillStyle(0x223555, 1).fillRect(0, 535, W, 200);
    g.fillStyle(0x2c3149, 1);
    g.beginPath();
    g.moveTo(0, 738); g.lineTo(120, 728); g.lineTo(280, 732); g.lineTo(W, 724); g.lineTo(W, H); g.lineTo(0, H);
    g.closePath(); g.fillPath();
    this.add.ellipse(198, 580, 172, 18, 0x15203a, 0.9);
  }
}
