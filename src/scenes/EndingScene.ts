import Phaser from 'phaser';
import { CSS, fmt, H, W } from '../config';
import { addAsset } from '../systems/assets';
import { Audio } from '../systems/audio';
import { Save } from '../systems/save';
import { BaseScene, Button, text } from '../ui/ui';
import type { RunStats } from './GameScene';
import { t } from '../i18n';

/** Kết thúc sau Núi Rạng (GDD mục 8). */
export class EndingScene extends BaseScene {
  constructor() {
    super('Ending');
  }

  create(st: RunStats) {
    this.initCamera();
    this.cameras.main.fadeIn(800, 255, 240, 210);
    Audio.setBiome('ending');
    Audio.setRate(0.8);

    this.add.rectangle(W / 2, H / 2, W, H, 0x1a2140);
    const bg = this.add.image(W / 2, 0, 'bg_dawn').setOrigin(0.5, 0);
    bg.setScale(H * 0.62 / bg.height);
    const sky = this.add.rectangle(W / 2, H / 2, W, H, 0xffd7a0, 0).setBlendMode(Phaser.BlendModes.ADD);
    const sun = this.add.circle(W / 2, 420, 60, 0xffc56b, 1).setAlpha(0);

    const boss = addAsset(this, W / 2, 470, 'bongmo_boss', 1.5);
    this.tweens.add({ targets: boss, y: 462, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const lam = addAsset(this, W / 2 - 110, 560, 'lam_idle', 0.9);

    const title = text(this, W / 2, 80, t('end.title'), { size: 42, font: 'display', color: CSS.ink });
    const line = text(this, W / 2, 140, t('end.intro'), { size: 15, color: '#3a2a1c', wrap: W - 60, lineSpacing: 4 });

    const a = new Button(this, W / 2, 650, { w: 342, h: 58, label: t('end.choiceA'), size: 26 }, () => choose('A'));
    const b = new Button(this, W / 2, 722, { w: 342, h: 58, label: t('end.choiceB'), style: 'outline', size: 20 }, () => choose('B'));
    text(this, W / 2, 790, t('end.stats', { d: fmt(st.distance), v: st.villagers }), { size: 12, color: CSS.dim });

    const choose = (which: 'A' | 'B') => {
      a.destroy();
      b.destroy();
      if (!Save.data.endingsSeen.includes(which)) Save.data.endingsSeen.push(which);
      Save.write();
      Audio.sfx('rescue');
      if (which === 'A') {
        this.tweens.add({ targets: boss, alpha: 0, scale: boss.scale * 1.6, duration: 1200 });
        this.tweens.add({ targets: sun, alpha: 1, y: 300, duration: 1500, ease: 'Sine.out' });
        this.tweens.add({ targets: sky, fillAlpha: 0.35, duration: 1500 });
        title.setText(t('end.aTitle'));
        line.setText(t('end.aText'));
      } else {
        this.tweens.add({ targets: boss, alpha: 0, duration: 3500 });
        this.tweens.add({ targets: sun, alpha: 1, y: 330, duration: 4500, ease: 'Sine.inOut' });
        this.tweens.add({ targets: sky, fillAlpha: 0.25, duration: 4500 });
        title.setText(t('end.bTitle'));
        line.setText(t('end.bText'));
        const ba = addAsset(this, W / 2 + 90, 560, 'ba_awake', 0.9).setAlpha(0);
        this.tweens.add({ targets: ba, alpha: 1, delay: 2500, duration: 1200 });
        const voice = text(this, W / 2 + 90, 395, t('end.voice'), { size: 32, font: 'display', color: CSS.ink }).setAlpha(0);
        this.tweens.add({ targets: voice, alpha: 1, delay: 3600, duration: 800 });
      }
      this.tweens.add({ targets: lam, x: lam.x + 20, duration: 800 });
      this.time.delayedCall(which === 'A' ? 2000 : 4800, () => {
        new Button(this, W / 2, 700, { w: 300, h: 58, label: t('common.home'), size: 26 }, () => this.scene.start('Menu'));
      });
    };
  }
}
