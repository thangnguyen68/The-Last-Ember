import { CSS, H, W } from '../config';
import { Audio } from '../systems/audio';
import { Save } from '../systems/save';
import { BaseScene, Button, panel, text } from '../ui/ui';
import type { GameScene } from './GameScene';
import { story, t } from '../i18n';

export class PauseScene extends BaseScene {
  constructor() {
    super('Pause');
  }

  create(data: { biome: string }) {
    this.initCamera();
    Audio.suspend();
    this.add.rectangle(W / 2, H / 2, W, H, 0x0b1020, 0.82).setInteractive();
    text(this, W / 2, 130, t('pause.title'), { size: 48, font: 'display' });

    // Thẻ truyện mới nhất đã mở của vùng hiện tại
    const n = Save.data.storyUnlocked[data.biome] ?? 0;
    panel(this, 30, 180, W - 60, 150, 18);
    if (n > 0) {
      text(this, W / 2, 205, t('pause.memory', { n }), { size: 14, color: CSS.shard, font: 'bold' });
      text(this, W / 2, 262, story(data.biome)[n - 1] ?? '', { size: 15, wrap: W - 100, lineSpacing: 4 });
    } else {
      const have = Save.data.biomeShards[data.biome] ?? 0;
      text(this, W / 2, 255, t('pause.collect', { have }), { size: 15, color: CSS.dim, wrap: W - 100 });
    }

    new Button(this, W / 2, 400, { w: 300, h: 60, label: t('pause.resume') }, () => this.resumeGame());
    new Button(this, W / 2, 476, { w: 300, h: 54, label: t('pause.restart'), style: 'outline' }, () => {
      Audio.resume();
      const mode = (this.scene.get('Game') as GameScene).mode;
      this.scene.start('Game', { mode });
    });
    new Button(this, W / 2, 544, { w: 300, h: 54, label: t('common.home'), style: 'outline' }, () => {
      Audio.resume();
      this.scene.stop('Game');
      this.scene.start('Menu');
    });

    const s = Save.data.settings;
    const sound = new Button(this, W / 2 - 78, 630, { w: 140, h: 48, label: '', style: 'dark', size: 15 }, () => {
      s.sound = !s.sound;
      Save.write();
      refresh();
    });
    const music = new Button(this, W / 2 + 78, 630, { w: 140, h: 48, label: '', style: 'dark', size: 15 }, () => {
      s.music = !s.music;
      Save.write();
      refresh();
    });
    const refresh = () => {
      sound.setLabel(t('common.sound', { v: t(s.sound ? 'common.on' : 'common.off') }));
      music.setLabel(t('common.music', { v: t(s.music ? 'common.on' : 'common.off') }));
    };
    refresh();

    this.input.keyboard?.on('keydown-ESC', () => this.resumeGame());
    this.input.keyboard?.on('keydown-P', () => this.resumeGame());
  }

  private resumeGame() {
    Audio.resume();
    this.scene.stop();
    this.scene.resume('Game');
  }
}
