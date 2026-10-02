// Truy cập manifest.json và tính tỉ lệ hiển thị theo kích thước logic (@1x).
import Phaser from 'phaser';

export interface AssetDef {
  category: string;
  png: string;
  size: [number, number];
  anchor: [number, number];
  name?: string;
  action?: 'jump' | 'slide' | 'lane' | 'slow';
  biome?: string;
}

export interface BiomeDef {
  id: string;
  order: number;
  name: string;
  background: string;
  length_m: number;
  obstacles: string[];
}

export interface Manifest {
  assets: Record<string, AssetDef>;
  biomes: BiomeDef[];
  animations: Record<string, { frames: string[]; fps: number; loop: boolean }>;
  lantern_states: Record<string, { min_flame: number; asset: string }>;
}

let manifest: Manifest;

export function setManifest(m: Manifest) {
  manifest = m;
  manifest.biomes.sort((a, b) => a.order - b.order);
}

export function getManifest() {
  return manifest;
}

export function def(key: string) {
  return manifest.assets[key];
}

/** Tạo image với điểm neo và kích thước logic theo manifest; mul nhân thêm tỉ lệ. */
export function addAsset(scene: Phaser.Scene, x: number, y: number, key: string, mul = 1) {
  const img = scene.add.image(x, y, key);
  applyDef(img, key, mul);
  return img;
}

export function applyDef(obj: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite, key: string, mul = 1) {
  const d = def(key);
  if (!d) return obj;
  obj.setOrigin(d.anchor[0], d.anchor[1]);
  obj.setScale(baseScale(obj.scene, key) * mul);
  return obj;
}

/** Tỉ lệ để texture @2x/@3x hiển thị đúng kích thước logic. */
export function baseScale(scene: Phaser.Scene, key: string) {
  const d = def(key);
  const tex = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  if (!d || !tex?.width) return 1;
  return d.size[0] / tex.width;
}

export function lanternAssetFor(flame: number) {
  if (flame >= 66) return 'lantern_lv3';
  if (flame >= 33) return 'lantern_lv2';
  if (flame > 0) return 'lantern_lv1';
  return 'lantern_out';
}
