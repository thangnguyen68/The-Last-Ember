import Phaser from 'phaser';
import { COLORS, CSS, fmt, LANTERNS, W } from '../config';
import { addAsset } from '../systems/assets';
import { Audio } from '../systems/audio';
import { Save } from '../systems/save';
import { BaseScene, Button, iconButton, panel, starryBackground, text, toast } from '../ui/ui';
import { t } from '../i18n';

export class ShopScene extends BaseScene {
  private fireflyText!: Phaser.GameObjects.Text;

  constructor() {
    super('Shop');
  }

  create() {
    this.initCamera();
    starryBackground(this);
    iconButton(this, 40, 46, 'ic_back', () => this.scene.start('Menu'));
    text(this, W / 2, 46, t('shop.title'), { size: 36, font: 'display' });
    panel(this, 286, 24, 86, 46, 23, 0x141b30, 0.95);
    this.add.image(310, 47, 'hud_firefly').setDisplaySize(22, 22);
    this.fireflyText = text(this, 352, 47, fmt(Save.data.fireflies), { size: 22, font: 'display' }).setOrigin(1, 0.5);
    text(this, W / 2, 100, t('shop.sub'), { size: 14, color: CSS.dim });
    this.drawCards();
  }

  private drawCards() {
    const keys = Object.keys(LANTERNS);
    keys.forEach((key, i) => {
      const L = LANTERNS[key];
      const y = 130 + i * 210;
      const owned = Save.data.ownedLanterns.includes(key);
      const equipped = Save.data.equippedLantern === key;
      const g = panel(this, 20, y, W - 40, 190, 22);
      if (equipped) g.lineStyle(2, COLORS.ember, 1).strokeRoundedRect(20, y, W - 40, 190, 22);

      const img = addAsset(this, 95, y + 40, key, 0.8);
      img.setY(y + 30 + img.displayHeight * img.originY);
      this.tweens.add({ targets: img, angle: { from: -3, to: 3 }, duration: 1400 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

      text(this, 180, y + 40, t(`lantern.${key}`), { size: 26, font: 'display', align: 'left' });
      text(this, 180, y + 78, t(`lanternDesc.${key}`), { size: 13, color: CSS.dim, align: 'left', wrap: 180 });

      let label: string;
      let style: 'primary' | 'outline' | 'dark' = 'primary';
      if (equipped) { label = t('shop.equipped'); style = 'dark'; }
      else if (owned) { label = t('shop.equip'); style = 'outline'; }
      else label = t('shop.price', { p: fmt(L.price) });

      const btn = new Button(this, 265, y + 145, { w: 170, h: 46, label, style, size: style === 'primary' ? 20 : 16 }, () => {
        if (equipped) return;
        if (!owned) {
          if (Save.data.fireflies < L.price) {
            toast(this, t('shop.notEnough'), 760);
            return;
          }
          Save.data.fireflies -= L.price;
          Save.data.ownedLanterns.push(key);
          Audio.sfx('powerup');
        }
        Save.data.equippedLantern = key;
        Save.write();
        this.scene.restart();
      });
      if (!owned && Save.data.fireflies < L.price) btn.setAlpha(0.6);
    });
  }
}
