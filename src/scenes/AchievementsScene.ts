import { CSS, fmt, W } from '../config';
import { Platform } from '../systems/platform';
import { Save } from '../systems/save';
import { BaseScene, Button, iconButton, panel, starryBackground, text, toast } from '../ui/ui';
import { makeShareImage } from '../systems/shareImage';
import { t } from '../i18n';

/** Thành tích: thống kê cá nhân + bảng xếp hạng bạn bè (Facebook). */
export class AchievementsScene extends BaseScene {
  constructor() {
    super('Achievements');
  }

  create() {
    this.initCamera();
    starryBackground(this);
    iconButton(this, 40, 46, 'ic_back', () => this.scene.start('Menu'));
    text(this, W / 2, 46, t('ach.title'), { size: 36, font: 'display' });

    const s = Save.data;
    panel(this, 20, 90, W - 40, 230, 22);
    const rows: [string, string][] = [
      [t('ach.best'), `${fmt(s.bestDistance)} m`],
      [t('ach.total'), `${fmt(s.stats.totalDistance)} m`],
      [t('ach.runs'), fmt(s.stats.runs)],
      [t('ach.shards'), fmt(s.stats.shards)],
      [t('ach.villagers'), fmt(s.stats.villagersSaved)],
    ];
    rows.forEach(([k, v], i) => {
      const y = 120 + i * 42;
      text(this, 42, y, k, { size: 15, align: 'left' });
      text(this, W - 42, y, v, { size: 22, font: 'display', align: 'right' });
    });

    text(this, W / 2, 352, t('ach.leaderboard'), { size: 26, font: 'display' });
    panel(this, 20, 376, W - 40, 330, 22);
    const loading = text(this, W / 2, 540, Platform.isFB ? t('ach.loading') : t('ach.playOnFb'), { size: 14, color: CSS.dim, wrap: W - 80 });

    Platform.getLeaderboard().then((entries) => {
      if (!this.scene.isActive()) return;
      if (!entries) { if (Platform.isFB) loading.setText(t('ach.lbUnavailable')); return; }
      if (!entries.length) { loading.setText(t('ach.empty')); return; }
      loading.destroy();
      entries.slice(0, 7).forEach((e, i) => {
        const y = 408 + i * 42;
        const color = e.isMe ? CSS.ember : CSS.paper;
        text(this, 44, y, `${e.rank}.`, { size: 20, font: 'display', align: 'left', color });
        text(this, 80, y, e.name, { size: 15, align: 'left', color });
        text(this, W - 44, y, `${fmt(e.score)} m`, { size: 20, font: 'display', align: 'right', color });
      });
    });

    if (Platform.isFB) {
      new Button(this, W / 2, 750, { w: 300, h: 54, label: t('ach.invite'), size: 24 }, async () => {
        const img = makeShareImage(this, t('share.best', { d: fmt(s.bestDistance) }));
        const res = await Platform.inviteFriends(t('ach.inviteText', { d: fmt(s.bestDistance) }), img);
        if (res.ok) toast(this, t('ach.inviteSent'), 680, CSS.firefly);
        else if (res.code !== 'USER_INPUT') toast(this, t('ach.inviteFail', { code: res.code ?? '' }), 680);
      });
    }
  }
}
