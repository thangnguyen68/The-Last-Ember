import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.json('manifest', 'manifest.json');
  }

  create() {
    if (!this.cache.json.get('manifest')) {
      // Không import main.ts ở đây để tránh vòng lặp import; dùng sự kiện error toàn cục
      throw new Error('Không tải được manifest.json');
    }
    this.scene.start('Preload');
  }
}
