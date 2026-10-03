// Ảnh chia sẻ / mời bạn bè gọn nhẹ (1200×627 JPEG) thay cho chụp toàn màn hình.
import Phaser from 'phaser';
import { FONT } from '../config';
import { t } from '../i18n';

export function makeShareImage(scene: Phaser.Scene, headline: string): string {
  const w = 1200, h = 627;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#1c2747');
  bg.addColorStop(1, '#0f1527');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Quầng sáng đèn lồng
  const glow = ctx.createRadialGradient(300, 330, 10, 300, 330, 300);
  glow.addColorStop(0, 'rgba(255,200,110,0.55)');
  glow.addColorStop(1, 'rgba(255,170,60,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Sao
  ctx.fillStyle = 'rgba(220,225,240,0.6)';
  for (let i = 0; i < 60; i++) {
    const x = (i * 197) % w, y = (i * 113) % (h * 0.7);
    ctx.beginPath();
    ctx.arc(x, y, (i % 3) + 1, 0, Math.PI * 2);
    ctx.fill();
  }

  const lam = scene.textures.exists('lam_idle') ? scene.textures.get('lam_idle').getSourceImage() as HTMLImageElement : null;
  if (lam) ctx.drawImage(lam, 120, 90, 330, 440);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ECE3CC';
  ctx.font = `92px ${FONT.display}`;
  ctx.fillText(t('game.title'), 500, 220);
  ctx.fillStyle = '#F0A23B';
  ctx.font = `600 52px ${FONT.body}`;
  wrap(ctx, headline, 500, 320, 640, 64);
  ctx.fillStyle = '#B7B2A3';
  ctx.font = `40px ${FONT.body}`;
  ctx.fillText(t('share.cta'), 500, 520);

  return c.toDataURL('image/jpeg', 0.85);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lh;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y);
}
