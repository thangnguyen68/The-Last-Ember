import { CSS, H, W } from '../config';
import { Audio } from '../systems/audio';
import { Save } from '../systems/save';
import { BaseScene, Button, iconButton, starryBackground, text, toast } from '../ui/ui';
import { getLang, LANG_LABEL, LANGS, setLang, t } from '../i18n';

export class SettingsScene extends BaseScene {
  private confirmReset = false;

  constructor() {
    super('Settings');
  }

  create() {
    this.initCamera();
    this.confirmReset = false;
    starryBackground(this);
    iconButton(this, 40, 46, 'ic_back', () => this.scene.start('Menu'));
    text(this, W / 2, 46, t('settings.title'), { size: 36, font: 'display' });

    const s = Save.data.settings;
    const onOff = (v: boolean) => t(v ? 'common.on' : 'common.off');

    // Ngôn ngữ: bấm để chuyển English <-> Tiếng Việt
    new Button(this, W / 2, 130, { w: 320, h: 58, label: t('settings.language', { v: LANG_LABEL[getLang()] }), style: 'dark', size: 18, icon: 'ic_info' }, () => {
      const next = LANGS[(LANGS.indexOf(getLang()) + 1) % LANGS.length];
      setLang(next);
      this.scene.restart();
    });

    const sound = new Button(this, W / 2, 200, { w: 320, h: 58, label: '', style: 'dark', size: 18, icon: 'ic_sound' }, () => {
      s.sound = !s.sound;
      Save.write();
      refresh();
    });
    const music = new Button(this, W / 2, 270, { w: 320, h: 58, label: '', style: 'dark', size: 18, icon: 'ic_music' }, () => {
      s.music = !s.music;
      Save.write();
      refresh();
    });
    const refresh = () => {
      sound.setLabel(t('common.sound', { v: onOff(s.sound) }));
      music.setLabel(t('common.music', { v: onOff(s.music) }));
    };
    refresh();

    text(this, W / 2, 360, t('settings.howTo'), { size: 26, font: 'display' });
    text(this, W / 2, 470, t('settings.help'), { size: 14, color: CSS.dim, lineSpacing: 8, wrap: W - 50 });

    const reset = new Button(this, W / 2, H - 110, { w: 260, h: 48, label: t('settings.reset'), style: 'outline', size: 15 }, () => {
      if (!this.confirmReset) {
        this.confirmReset = true;
        reset.setLabel(t('settings.resetConfirm'));
        return;
      }
      try { localStorage.removeItem('nlcc_save'); } catch { /* ignore */ }
      const keep = Save.data.settings;
      Save.data = { ...Save.data, fireflies: 0, bestDistance: 0, ownedLanterns: ['lantern_up1'], equippedLantern: 'lantern_up1', endingsSeen: [], storyUnlocked: {}, biomeShards: {}, stats: { runs: 0, totalDistance: 0, villagersSaved: 0, shards: 0 }, settings: keep };
      Save.write();
      Audio.sfx('out');
      toast(this, t('settings.resetDone'), H - 170);
      this.time.delayedCall(800, () => this.scene.restart());
    });

    text(this, W / 2, H - 50, `${t('game.title')} · v1.1`, { size: 12, color: CSS.mist });
  }
}
