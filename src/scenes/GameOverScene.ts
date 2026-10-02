import Phaser from 'phaser';
import { CSS, FB, fmt, H, REVIVE_COST, W } from '../config';
import { addAsset } from '../systems/assets';
import { Audio } from '../systems/audio';
import { Platform } from '../systems/platform';
import { Save } from '../systems/save';
import { BaseScene, Button, iconButton, panel, text, toast } from '../ui/ui';
import type { GameScene, RunStats } from './GameScene';
import { t } from '../i18n';

let deaths = 0;

/** Chụp màn hình hiện tại thành data URL để chia sẻ. */
export function snapshot(scene: Phaser.Scene): Promise<string> {
  return new Promise((resolve) => {
    scene.game.renderer.snapshot((img) => resolve((img as HTMLImageElement).src), 'image/jpeg', 0.8);
  });
}

export class GameOverScene extends BaseScene {
  constructor() {
    super('GameOver');
  }

  create(st: RunStats) {
    this.initCamera();
    deaths++;
    this.add.rectangle(W / 2, H / 2, W, H, 0x111829, 0.95).setInteractive();

    const lantern = addAsset(this, W / 2, 80, 'lantern_out', 0.95);
    this.tweens.add({ targets: lantern, angle: { from: -4, to: 4 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const title = t(st.reason === 'mist' ? 'over.mistTitle' : 'over.flameTitle');
    text(this, W / 2, 290, title, { size: 46, font: 'display' });
    const sub = t(st.reason === 'mist' ? 'over.mistSub' : 'over.flameSub', { biome: t(`biome.${st.biomeId}`) });
    text(this, W / 2, 355, sub, { size: 15, color: CSS.dim, wrap: W - 60, lineSpacing: 4 });

    // Bảng thống kê
    panel(this, 24, 401, W - 48, 204, 26);
    const rows: [string, string][] = [
      [t('over.distance'), `${fmt(st.distance)} m`],
      [t('over.shards'), String(st.shards)],
      [t('over.fireflies'), `+${st.fireflies}`],
      [t('over.villagers'), String(st.villagers)],
    ];
    rows.forEach(([k, v], i) => {
      const y = 434 + i * 44;
      text(this, 46, y, k, { size: 16, align: 'left' });
      text(this, W - 46, y, v, { size: 22, font: 'display', align: 'right' });
    });
    if (Math.floor(st.distance) >= Save.data.bestDistance && st.distance > 0) {
      text(this, W / 2, 392, t('over.newBest'), { size: 15, color: CSS.shard, font: 'bold' });
    }

    // Thắp lại
    const enough = Save.data.fireflies >= REVIVE_COST;
    const useAd = !enough && Platform.rewardedReady;
    const reviveLabel = useAd ? t('over.reviveAd') : t('over.revive', { n: REVIVE_COST });
    const revive = new Button(this, W / 2, 646, { w: 342, h: 60, label: reviveLabel, size: 26 }, async () => {
      if (useAd) {
        const ok = await Platform.showRewarded();
        if (!ok) { toast(this, t('over.adIncomplete'), 600); return; }
      } else {
        Save.data.fireflies -= REVIVE_COST;
        Save.write();
      }
      this.doRevive();
    });
    revive.setEnabled(st.canRevive && (enough || useAd));
    if (!st.canRevive) revive.setLabel(t('over.revived'));

    new Button(this, W / 2, 716, { w: 342, h: 54, label: t('over.restart'), style: 'outline' }, () => {
      const go = () => this.scene.start('Game', { mode: st.mode });
      if (FB.interstitialPlacementId && deaths % FB.interstitialEveryNDeaths === 0) Platform.showInterstitial().finally(go);
      else go();
    });
    const home = text(this, W / 2, 779, t('common.home'), { size: 16, color: CSS.dim });
    home.setInteractive({ useHandCursor: true }).on('pointerup', () => {
      Audio.sfx('click');
      this.scene.stop('Game');
      this.scene.start('Menu');
    });

    // Chia sẻ thành tích
    iconButton(this, W - 40, 40, 'ic_share', async () => {
      const img = await snapshot(this);
      const ok = await Platform.share(t('over.shareText', { d: fmt(st.distance) }), img);
      if (!ok && !Platform.isFB) toast(this, t('over.shareFbOnly'), 600);
    });
    text(this, W - 40, 72, t('over.share'), { size: 11, color: CSS.dim });

    lantern.setY(140);
  }

  private doRevive() {
    const game = this.scene.get('Game') as GameScene;
    game.revive();
    this.scene.stop();
    this.scene.resume('Game');
  }
}
