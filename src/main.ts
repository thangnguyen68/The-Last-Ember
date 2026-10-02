import Phaser from 'phaser';
import { DPR, H, W } from './config';
import { Platform } from './systems/platform';
import { Save } from './systems/save';
import { Audio } from './systems/audio';
import { applyDocumentLang } from './i18n';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { PauseScene } from './scenes/PauseScene';
import { GameOverScene } from './scenes/GameOverScene';
import { ShopScene } from './scenes/ShopScene';
import { JourneyScene } from './scenes/JourneyScene';
import { AchievementsScene } from './scenes/AchievementsScene';
import { SettingsScene } from './scenes/SettingsScene';
import { EndingScene } from './scenes/EndingScene';

/** Hiện lỗi ngay trên màn hình (giúp chẩn đoán trong webview Facebook không mở được DevTools). */
export function showFatal(msg: string) {
  console.error('[FATAL]', msg);
  let el = document.getElementById('fatal');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fatal';
    el.style.cssText = 'position:fixed;left:0;right:0;bottom:0;max-height:45%;overflow:auto;z-index:99999;background:rgba(120,20,20,.92);color:#fff;font:12px/1.4 monospace;padding:10px;white-space:pre-wrap';
    document.body.appendChild(el);
  }
  el.textContent += msg + '\n';
  // Đảm bảo màn tải của Facebook biến mất để người chơi/dev thấy được lỗi
  Platform.start();
}

window.addEventListener('error', (e) => showFatal(`Error: ${e.message} @ ${e.filename}:${e.lineno}`));
window.addEventListener('unhandledrejection', (e) => showFatal(`Promise: ${e.reason?.message ?? e.reason}`));

async function boot() {
  await Platform.init();
  // Bảo hiểm: nếu sau 40 s game vẫn chưa vào được (Facebook vẫn hiện màn tải) thì báo lỗi
  setTimeout(() => {
    const g = (window as any).__nlccGame as Phaser.Game | undefined;
    if (!g || !g.scene.isActive('Menu') && !g.scene.getScenes(true).length) showFatal('Boot timeout: game không khởi động được trong 40 s');
  }, 40000);
  await Save.load();
  applyDocumentLang();
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('32px PatrickHand'),
        document.fonts.load('16px BeVietnam'),
        document.fonts.load('600 16px BeVietnam'),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* font fallback */ }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W * DPR,
    height: H * DPR,
    backgroundColor: '#172036',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, roundPixels: false },
    input: { activePointers: 2 },
    scene: [BootScene, PreloadScene, MenuScene, GameScene, PauseScene, GameOverScene, ShopScene, JourneyScene, AchievementsScene, SettingsScene, EndingScene],
  });

  (window as any).__nlccGame = game;
  if (import.meta.env.DEV) (window as any).__game = game;

  const unlock = () => Audio.unlock();
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

boot().catch((e) => showFatal(`Boot: ${e?.stack ?? e}`));
