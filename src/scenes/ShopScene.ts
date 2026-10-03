import { AD_REWARD, COLORS, CSS, fmt, ITEM_MAX_STOCK, LANTERNS, SHOP_ITEMS, W } from '../config';
import { addAsset } from '../systems/assets';
import { Audio } from '../systems/audio';
import { Platform } from '../systems/platform';
import { Save } from '../systems/save';
import { BaseScene, Button, iconButton, panel, starryBackground, text, toast } from '../ui/ui';
import { t } from '../i18n';

type Tab = 'lanterns' | 'items';

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Số lượt xem quảng cáo nhận đom đóm còn lại hôm nay. */
export function adsLeftToday() {
  const s = Save.data;
  if (s.adDay !== today()) return AD_REWARD.dailyLimit;
  return Math.max(0, AD_REWARD.dailyLimit - s.adCount);
}

export class ShopScene extends BaseScene {
  private tab: Tab = 'lanterns';
  private busy = false;
  private msg = '';

  constructor() {
    super('Shop');
  }

  init(data: { tab?: Tab; msg?: string }) {
    if (data?.tab) this.tab = data.tab;
    this.msg = data?.msg ?? '';
    this.busy = false;
  }

  create() {
    this.initCamera();
    starryBackground(this);
    iconButton(this, 40, 46, 'ic_back', () => this.scene.start('Menu'));
    text(this, W / 2, 46, t('shop.title'), { size: 36, font: 'display' });
    panel(this, 286, 24, 86, 46, 23, 0x141b30, 0.95);
    this.add.image(310, 47, 'hud_firefly').setDisplaySize(22, 22);
    text(this, 352, 47, fmt(Save.data.fireflies), { size: 22, font: 'display' }).setOrigin(1, 0.5);

    this.drawTabs();
    if (this.tab === 'lanterns') this.drawLanterns();
    else this.drawItems();
    if (this.msg) toast(this, this.msg, 420, CSS.firefly);
  }

  private drawTabs() {
    const tabs: [Tab, string][] = [['lanterns', t('shop.tabLanterns')], ['items', t('shop.tabItems')]];
    tabs.forEach(([id, label], i) => {
      const x = 20 + i * ((W - 40) / 2);
      const w = (W - 40) / 2 - 6;
      const active = this.tab === id;
      const g = this.add.graphics();
      g.fillStyle(active ? COLORS.ember : 0x141b30, active ? 1 : 0.95).fillRoundedRect(x, 84, w, 40, 20);
      const lbl = text(this, x + w / 2, 104, label, { size: 16, font: 'bold', color: active ? CSS.ink : CSS.paper });
      const zone = this.add.zone(x + w / 2, 104, w, 40).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        if (active) return;
        Audio.unlock();
        Audio.sfx('click');
        this.scene.restart({ tab: id });
      });
      void lbl;
    });
  }

  // ---------------------------------------------------------------- Đèn lồng

  private drawLanterns() {
    text(this, W / 2, 146, t('shop.sub'), { size: 13, color: CSS.dim });
    Object.keys(LANTERNS).forEach((key, i) => {
      const L = LANTERNS[key];
      const y = 166 + i * 220;
      const owned = Save.data.ownedLanterns.includes(key);
      const equipped = Save.data.equippedLantern === key;
      const g = panel(this, 20, y, W - 40, 200, 22);
      if (equipped) g.lineStyle(2, COLORS.ember, 1).strokeRoundedRect(20, y, W - 40, 200, 22);

      const img = addAsset(this, 95, y + 40, key, 0.8);
      img.setY(y + 34 + img.displayHeight * img.originY);
      this.tweens.add({ targets: img, angle: { from: -3, to: 3 }, duration: 1400 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

      text(this, 180, y + 40, t(`lantern.${key}`), { size: 26, font: 'display', align: 'left' });
      text(this, 180, y + 80, t(`lanternDesc.${key}`), { size: 13, color: CSS.dim, align: 'left', wrap: 180 });

      let label: string;
      let style: 'primary' | 'outline' | 'dark' = 'primary';
      if (equipped) { label = t('shop.equipped'); style = 'dark'; }
      else if (owned) { label = t('shop.equip'); style = 'outline'; }
      else label = t('shop.price', { p: fmt(L.price) });

      const btn = new Button(this, 265, y + 155, { w: 170, h: 46, label, style, size: style === 'primary' ? 20 : 16 }, () => {
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
        this.scene.restart({ tab: 'lanterns' });
      });
      if (!owned && Save.data.fireflies < L.price) btn.setAlpha(0.6);
    });
  }

  // ---------------------------------------------------------------- Vật phẩm + quảng cáo

  private drawItems() {
    const adOk = Platform.rewardedAvailable;

    // Thẻ xem quảng cáo nhận đom đóm
    panel(this, 20, 140, W - 40, 92, 22);
    this.add.image(58, 186, 'firefly').setDisplaySize(48, 48);
    text(this, 92, 170, t('shop.adFireflies', { n: AD_REWARD.fireflies }), { size: 16, font: 'bold', align: 'left' });
    const left = adsLeftToday();
    text(this, 92, 200, adOk ? (left > 0 ? t('shop.adLeft', { n: left }) : t('shop.adLimit')) : t('ad.unavailable'), { size: 12, color: CSS.dim, align: 'left', wrap: 190 });
    const adBtn = new Button(this, 318, 186, { w: 84, h: 44, label: t('shop.watchAd'), size: 16, font: 'bold' }, () => {
      this.watchAd(() => {
        const s = Save.data;
        if (s.adDay !== today()) { s.adDay = today(); s.adCount = 0; }
        s.adCount++;
        s.fireflies += AD_REWARD.fireflies;
        Save.write();
        return t('ad.reward', { n: AD_REWARD.fireflies });
      });
    });
    adBtn.setEnabled(adOk && left > 0);

    text(this, W / 2, 252, t('shop.itemsSub'), { size: 12, color: CSS.dim, wrap: W - 50 });

    Object.keys(SHOP_ITEMS).forEach((key, i) => {
      const y = 274 + i * 110;
      const owned = Save.data.items[key] ?? 0;
      const full = owned >= ITEM_MAX_STOCK;
      const price = SHOP_ITEMS[key].price;
      panel(this, 20, y, W - 40, 100, 20);
      this.add.image(62, y + 50, key).setDisplaySize(54, 54);
      text(this, 100, y + 26, t(`pu.${key}`), { size: 20, font: 'display', align: 'left' });
      text(this, 100, y + 52, t(`itemDesc.${key}`), { size: 11, color: CSS.dim, align: 'left', wrap: 118 });
      text(this, 100, y + 78, full ? t('shop.max') : t('shop.owned', { n: owned }), { size: 12, color: owned ? CSS.shard : CSS.mist, align: 'left', font: 'bold' });

      const buy = new Button(this, 290, y + 30, { w: 130, h: 38, label: t('shop.price', { p: price }), size: 15, font: 'bold' }, () => {
        if (Save.data.fireflies < price) { toast(this, t('shop.notEnough'), 760); return; }
        Save.data.fireflies -= price;
        this.grantItem(key);
      });
      buy.setEnabled(!full);
      if (!full && Save.data.fireflies < price) buy.setAlpha(0.6);

      const ad = new Button(this, 290, y + 74, { w: 130, h: 34, label: t('shop.watchAd'), style: 'outline', size: 14 }, () => {
        this.watchAd(() => {
          this.grantItem(key, false);
          return t('shop.gotItem', { name: t(`pu.${key}`) });
        });
      });
      ad.setEnabled(adOk && !full);
    });
  }

  private grantItem(key: string, restart = true) {
    const s = Save.data;
    s.items[key] = Math.min(ITEM_MAX_STOCK, (s.items[key] ?? 0) + 1);
    Save.write();
    Audio.sfx('powerup');
    if (restart) this.scene.restart({ tab: 'items' });
  }

  /** Hiện quảng cáo có thưởng; reward() chỉ chạy khi xem hết, trả về câu thông báo. */
  private async watchAd(reward: () => string) {
    if (this.busy) return;
    this.busy = true;
    const loading = toast(this, t('ad.loading'), 760);
    Audio.suspend();
    const res = await Platform.showRewarded();
    Audio.resume();
    loading.destroy();
    this.busy = false;
    if (!this.scene.isActive()) return;
    if (res === 'ok') {
      const msg = reward();
      Audio.sfx('rescue');
      this.scene.restart({ tab: 'items', msg });
    } else if (res === 'cancelled') {
      toast(this, t('over.adIncomplete'), 760);
    } else {
      toast(this, t('ad.unavailable'), 760);
    }
  }
}
