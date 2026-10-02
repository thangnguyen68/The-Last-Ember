import { defineConfig } from 'vite';
import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Game assets live at project root (assets/, fonts/, manifest.json) and are served as-is in dev.
// On build they are copied into dist/ next to index.html (SVG sources are skipped, only PNG is used).
function copyGameData() {
  return {
    name: 'copy-game-data',
    closeBundle() {
      const out = resolve(import.meta.dirname, 'dist');
      cpSync(resolve(import.meta.dirname, 'assets'), resolve(out, 'assets'), {
        recursive: true,
        filter: (src: string) => !src.endsWith('.svg'),
      });
      cpSync(resolve(import.meta.dirname, 'fonts'), resolve(out, 'fonts'), { recursive: true });
      cpSync(resolve(import.meta.dirname, 'manifest.json'), resolve(out, 'manifest.json'));
      if (existsSync(resolve(import.meta.dirname, 'fbapp-config.json'))) {
        cpSync(resolve(import.meta.dirname, 'fbapp-config.json'), resolve(out, 'fbapp-config.json'));
      }
    },
  };
}

// Facebook webview: dùng <script defer> thường thay cho <script type="module" crossorigin>
function classicScript() {
  return {
    name: 'classic-script',
    apply: 'build' as const,
    transformIndexHtml: {
      order: 'post' as const,
      handler(html: string) {
        return html.replace(/<script type="module" crossorigin src=/g, '<script defer src=');
      },
    },
  };
}

export default defineConfig({
  base: './',
  publicDir: false,
  server: { host: true, port: 5173 },
  build: {
    outDir: 'dist',
    assetsDir: 'js', // tránh trùng với thư mục assets/ của game
    chunkSizeWarningLimit: 2000,
    modulePreload: false,
    target: 'es2018',
    rollupOptions: {
      output: { format: 'iife' },
    },
  },
  plugins: [copyGameData(), classicScript()],
});
