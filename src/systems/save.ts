// Lưu trữ theo GDD mục 10: localStorage key "nlcc_save", đồng bộ thêm lên Facebook (player data) nếu có.
import { Platform } from './platform';

const KEY = 'nlcc_save';

export interface SaveData {
  fireflies: number;
  bestDistance: number;
  ownedLanterns: string[];
  equippedLantern: string;
  endingsSeen: string[];
  /** biomeId -> số đoạn truyện đã mở (0..3) */
  storyUnlocked: Record<string, number>;
  /** biomeId -> tổng mảnh ký ức đã nhặt trong vùng */
  biomeShards: Record<string, number>;
  settings: { sound: boolean; music: boolean; lang: 'en' | 'vi' };
  stats: { runs: number; totalDistance: number; villagersSaved: number; shards: number };
  updatedAt: number;
}

function defaults(): SaveData {
  return {
    fireflies: 0,
    bestDistance: 0,
    ownedLanterns: ['lantern_up1'],
    equippedLantern: 'lantern_up1',
    endingsSeen: [],
    storyUnlocked: {},
    biomeShards: {},
    settings: { sound: true, music: true, lang: 'en' },
    stats: { runs: 0, totalDistance: 0, villagersSaved: 0, shards: 0 },
    updatedAt: 0,
  };
}

function parse(raw: string | null): SaveData | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    const base = defaults();
    return {
      ...base,
      ...d,
      settings: { ...base.settings, ...(d.settings || {}) },
      stats: { ...base.stats, ...(d.stats || {}) },
    };
  } catch {
    return null;
  }
}

export const Save = {
  data: defaults(),

  /** Nạp dữ liệu: ưu tiên bản mới hơn giữa localStorage và Facebook. */
  async load() {
    let local: SaveData | null = null;
    try { local = parse(localStorage.getItem(KEY)); } catch { /* storage bị chặn */ }
    const remote = parse(await Platform.loadData(KEY));
    const pick = [local, remote].filter(Boolean).sort((a, b) => b!.updatedAt - a!.updatedAt)[0];
    this.data = pick ?? defaults();
  },

  write() {
    this.data.updatedAt = Date.now();
    const raw = JSON.stringify(this.data);
    try { localStorage.setItem(KEY, raw); } catch { /* ignore */ }
    Platform.saveData(KEY, raw);
  },
};
