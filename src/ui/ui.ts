// Các thành phần giao diện dùng chung: chữ, khung bo tròn, nút.
import Phaser from 'phaser';
import { COLORS, CSS, DPR, FONT, H, W } from '../config';
import { Audio } from '../systems/audio';

/** Scene cơ sở: zoom camera theo DPR để làm việc trong hệ tọa độ logic 390×844. */
export class BaseScene extends Phaser.Scene {
  initCamera() {
    this.cameras.main.setZoom(DPR).centerOn(W / 2, H / 2);
  }
}

export interface TextOpts {
  size?: number;
  font?: 'display' | 'body' | 'bold';
  color?: string;
  align?: 'left' | 'center' | 'right';
  wrap?: number;
  origin?: [number, number];
  lineSpacing?: number;
}

export function text(scene: Phaser.Scene, x: number, y: number, str: string, o: TextOpts = {}) {
  const t = scene.add.text(x, y, str, {
    fontFamily: o.font === 'display' ? FONT.display : FONT.body,
    fontStyle: o.font === 'bold' ? '600' : 'normal',
    fontSize: `${o.size ?? 16}px`,
    color: o.color ?? CSS.paper,
    align: o.align ?? 'center',
    wordWrap: o.wrap ? { width: o.wrap, useAdvancedWrap: true } : undefined,
    lineSpacing: o.lineSpacing ?? 0,
    padding: { top: 4, bottom: 4 },
  });
  t.setResolution(DPR);
  const org = o.origin ?? [o.align === 'left' ? 0 : o.align === 'right' ? 1 : 0.5, 0.5];
  t.setOrigin(org[0], org[1]);
  return t;
}

export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, r = 18, color = COLORS.panel, alpha = 0.92) {
  const g = scene.add.graphics();
  g.fillStyle(color, alpha);
  g.fillRoundedRect(x, y, w, h, r);
  return g;
}

export interface ButtonOpts {
  w: number;
  h: number;
  label: string;
  style?: 'primary' | 'outline' | 'ghost' | 'dark';
  size?: number;
  font?: 'display' | 'body' | 'bold';
  icon?: string;
  disabled?: boolean;
}

export class Button extends Phaser.GameObjects.Container {
  bg: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  private o: ButtonOpts;
  private enabled = true;

  constructor(scene: Phaser.Scene, x: number, y: number, o: ButtonOpts, onClick: () => void) {
    super(scene, x, y);
    this.o = o;
    this.bg = scene.add.graphics();
    this.add(this.bg);
    const isPrimary = (o.style ?? 'primary') === 'primary';
    this.label = text(scene, 0, 0, o.label, {
      size: o.size ?? (isPrimary ? 28 : 18),
      font: o.font ?? (isPrimary ? 'display' : 'bold'),
      color: isPrimary ? CSS.ink : CSS.paper,
    });
    this.add(this.label);
    if (o.icon) {
      const ic = scene.add.image(-o.w / 2 + 34, 0, o.icon).setDisplaySize(24, 24);
      this.add(ic);
    }
    this.setSize(o.w, o.h);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => {
      if (!this.enabled) return;
      this.setScale(0.96);
    });
    this.on('pointerout', () => this.setScale(1));
    this.on('pointerup', () => {
      this.setScale(1);
      if (!this.enabled) return;
      Audio.unlock();
      Audio.sfx('click');
      onClick();
    });
    this.setEnabled(!o.disabled);
    scene.add.existing(this);
  }

  setEnabled(v: boolean) {
    this.enabled = v;
    this.draw();
    this.setAlpha(v ? 1 : 0.5);
    return this;
  }

  setLabel(s: string) {
    this.label.setText(s);
    return this;
  }

  private draw() {
    const { w, h } = this.o;
    const g = this.bg;
    g.clear();
    switch (this.o.style ?? 'primary') {
      case 'primary':
        g.fillStyle(COLORS.ember, 1).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
        break;
      case 'outline':
        g.lineStyle(2, 0x4a5a8a, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
        break;
      case 'dark':
        g.fillStyle(COLORS.tile, 1).fillRoundedRect(-w / 2, -h / 2, w, h, Math.min(18, h / 2));
        break;
      case 'ghost':
        break;
    }
  }
}

/** Nút tròn có icon và nhãn bên dưới (menu chính). */
export function roundButton(scene: Phaser.Scene, x: number, y: number, icon: string, label: string, onClick: () => void) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0x2b3350, 1).fillCircle(0, 0, 29);
  g.lineStyle(2, 0x3d4a78, 1).strokeCircle(0, 0, 29);
  const ic = scene.add.image(0, 0, icon).setDisplaySize(26, 26);
  const t = text(scene, 0, 44, label, { size: 13 });
  c.add([g, ic, t]);
  c.setSize(70, 70);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => c.setScale(0.94));
  c.on('pointerout', () => c.setScale(1));
  c.on('pointerup', () => {
    c.setScale(1);
    Audio.unlock();
    Audio.sfx('click');
    onClick();
  });
  return c;
}

/** Nút icon tròn nhỏ (đóng, quay lại, tạm dừng...). */
export function iconButton(scene: Phaser.Scene, x: number, y: number, icon: string, onClick: () => void, r = 22) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(COLORS.tile, 0.95).fillCircle(0, 0, r);
  const ic = scene.add.image(0, 0, icon).setDisplaySize(r * 0.9, r * 0.9);
  c.add([g, ic]);
  c.setSize(r * 2 + 8, r * 2 + 8);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerup', () => {
    Audio.unlock();
    Audio.sfx('click');
    onClick();
  });
  return c;
}

/** Nền tối có sao cho các màn hình menu. */
export function starryBackground(scene: Phaser.Scene, top = 0x1c2747, bottom = 0x161d33) {
  const g = scene.add.graphics();
  g.fillGradientStyle(top, top, bottom, bottom, 1);
  g.fillRect(0, 0, W, H);
  const rnd = new Phaser.Math.RandomDataGenerator(['nlcc']);
  for (let i = 0; i < 28; i++) {
    const s = scene.add.circle(rnd.between(0, W), rnd.between(0, H * 0.55), rnd.realInRange(0.8, 2.6), 0xcfd3e0, rnd.realInRange(0.3, 0.8));
    scene.tweens.add({ targets: s, alpha: 0.15, duration: rnd.between(1200, 3000), yoyo: true, repeat: -1, delay: rnd.between(0, 2000) });
  }
  return g;
}

export function toast(scene: Phaser.Scene, msg: string, y = H * 0.42, color = CSS.paper) {
  const t = text(scene, W / 2, y, msg, { size: 22, font: 'display', color, wrap: W - 60 });
  t.setDepth(5000).setAlpha(0);
  scene.tweens.add({ targets: t, alpha: 1, y: y - 10, duration: 250 });
  scene.tweens.add({ targets: t, alpha: 0, y: y - 30, delay: 1500, duration: 400, onComplete: () => t.destroy() });
  return t;
}
