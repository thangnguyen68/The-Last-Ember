import Phaser from 'phaser';
import { BIOME_LENGTH, CSS, H, STORY_THRESHOLDS, W } from '../config';
import { getManifest } from '../systems/assets';
import { Save } from '../systems/save';
import { BaseScene, iconButton, panel, starryBackground, text } from '../ui/ui';
import { story, t } from '../i18n';

/** Hành trình: danh sách vùng đất, truyện đã mở và kết thúc đã đạt. */
export class JourneyScene extends BaseScene {
  constructor() {
    super('Journey');
  }

  create() {
    this.initCamera();
    starryBackground(this);
    iconButton(this, 40, 46, 'ic_back', () => this.scene.start('Menu'));
    text(this, W / 2, 46, t('journey.title'), { size: 36, font: 'display' });

    const content = this.add.container(0, 0);
    let y = 90;
    for (const b of getManifest().biomes) {
      const reached = Save.data.bestDistance >= (b.order - 1) * BIOME_LENGTH;
      const n = Save.data.storyUnlocked[b.id] ?? 0;
      const shards = Save.data.biomeShards[b.id] ?? 0;
      const cardH = reached ? 100 + n * 70 + (n < 3 ? 34 : 0) : 96;
      content.add(panel(this, 20, y, W - 40, cardH, 20));

      const thumb = this.add.image(84, y + 48, b.background).setDisplaySize(104, 56);
      if (!reached) thumb.setTint(0x333a50);
      content.add(thumb);

      content.add(text(this, 150, y + 34, `${b.order}. ${t(`biome.${b.id}`)}`, { size: 22, font: 'display', align: 'left' }));
      const sub = reached ? t('journey.progress', { s: shards, n }) : t('journey.locked', { m: (b.order - 1) * BIOME_LENGTH });
      content.add(text(this, 150, y + 64, sub, { size: 12, color: CSS.dim, align: 'left' }));
      if (!reached) content.add(this.add.image(W - 50, y + 48, 'ic_lock').setDisplaySize(22, 22));

      if (reached) {
        for (let i = 0; i < 3; i++) {
          const ty = y + 100 + i * 70;
          if (i < n) {
            content.add(text(this, 36, ty + 10, story(b.id)[i] ?? '', { size: 13, align: 'left', wrap: W - 76, origin: [0, 0.5] }));
          } else if (i === n) {
            content.add(text(this, 36, ty, t('journey.need', { n: STORY_THRESHOLDS[i] }), { size: 12, color: CSS.mist, align: 'left' }));
          }
        }
      }
      y += cardH + 14;
    }

    // Kết thúc
    const endings = Save.data.endingsSeen;
    content.add(panel(this, 20, y, W - 40, 110, 20));
    content.add(text(this, W / 2, y + 26, t('journey.endings'), { size: 24, font: 'display' }));
    content.add(text(this, W / 2, y + 58, t('journey.endingA', { s: endings.includes('A') ? t('journey.reached') : '???' }), { size: 14, color: endings.includes('A') ? CSS.shard : CSS.mist }));
    content.add(text(this, W / 2, y + 84, t('journey.endingB', { s: endings.includes('B') ? t('journey.reached') : '???' }), { size: 14, color: endings.includes('B') ? CSS.shard : CSS.mist }));
    y += 130;

    this.enableScroll(content, y);
  }

  private enableScroll(content: Phaser.GameObjects.Container, total: number) {
    const minY = Math.min(0, H - total - 20);
    let lastY: number | null = null;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { lastY = p.worldY; });
    this.input.on('pointerup', () => { lastY = null; });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (lastY === null || !p.isDown) return;
      content.y = Phaser.Math.Clamp(content.y + (p.worldY - lastY), minY, 0);
      lastY = p.worldY;
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      content.y = Phaser.Math.Clamp(content.y - dy * 0.5, minY, 0);
    });
  }
}
