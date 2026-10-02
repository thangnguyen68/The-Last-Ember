// Mọi con số cân chỉnh gameplay nằm ở đây (theo GDD mục 5).

export const W = 390;
export const H = 844;
/** Độ phân giải render thực = logic × DPR để chữ và hình sắc nét trên điện thoại. */
export const DPR = Math.min(2, Math.max(1, Math.round(window.devicePixelRatio || 1)));

export const COLORS = {
  ink: 0x172036,
  ember: 0xf0a23b,
  emberDark: 0xd9592b,
  paper: 0xece3cc,
  mist: 0x5e6578,
  jade: 0x6fa587,
  tile: 0x212c47,
  panel: 0x1a2440,
  shard: 0xffd98a,
  firefly: 0xe8f27a,
};

export const CSS = {
  ink: '#172036',
  ember: '#F0A23B',
  paper: '#ECE3CC',
  mist: '#8D93A6',
  shard: '#FFD98A',
  firefly: '#E8F27A',
  dim: '#B7B2A3',
};

export const FONT = {
  display: 'PatrickHand, "Comic Sans MS", cursive',
  body: 'BeVietnam, Arial, sans-serif',
};

/** Đường chạy giả 3D */
export const ROAD = {
  horizonY: 360,
  playerY: 780,
  topLeft: 150,
  topRight: 240,
  bottomWidth: W,
  minScale: 0.15,
  /** Khoảng cách (m) từ chân trời đến người chơi */
  viewDist: 55,
};

export const PLAYER = {
  laneTweenMs: 120,
  jumpMs: 600,
  jumpHeight: 120,
  slideMs: 600,
  swipeMin: 30,
  /** Độ cao tối thiểu để vượt chướng ngại "jump" */
  clearHeight: 38,
  invulnMs: 1000,
  hurtIconMs: 300,
};

export const SPEED = {
  start: 8,
  accel: 0.1,
  max: 20,
  /** Chế độ vô tận: mỗi vòng 5 vùng tăng thêm trần tốc độ */
  endlessMaxPerLoop: 2,
  endlessMaxCap: 28,
  slowFactor: 0.7,
  slowMs: 1500,
};

export const FLAME = {
  max: 100,
  decayPerSec: 2,
  shardGain: 15,
  hitDamage: 25,
  visionMin: 140,
  visionMax: 520,
  reviveFlame: 60,
};

export const MIST = {
  calmSecToDrop: 15,
  overlayHeights: [0, 60, 120, 200],
  musicSlow: 0.9,
};

export const SPAWN = {
  rowMin: 18,
  rowMax: 28,
  shardEvery: 60,
  shardChainMin: 3,
  shardChainMax: 5,
  fireflyEvery: 40,
  fireflyChainMin: 5,
  fireflyChainMax: 8,
  itemGap: 3,
  villagerEvery: 250,
  powerupEvery: 300,
  /** Không sinh chướng ngại trong N mét đầu tiên */
  safeStart: 30,
};

export const VILLAGER = {
  minFlame: 50,
  flameCost: 20,
  reward: 10,
};

export const POWERUPS: Record<string, { name: string; durationMs: number }> = {
  pu_magnet: { name: 'Nam châm ký ức', durationMs: 8000 },
  pu_shield: { name: 'Khiên tre', durationMs: 0 },
  pu_boost: { name: 'Bùng lửa', durationMs: 5000 },
  pu_double: { name: 'Nhân đôi', durationMs: 10000 },
  pu_kite: { name: 'Cánh diều', durationMs: 4000 },
};

export const LANTERNS: Record<string, { name: string; price: number; decayMul: number; visionBonus: number; desc: string }> = {
  lantern_up1: { name: 'Đèn giấy dó', price: 0, decayMul: 1, visionBonus: 0, desc: 'Đèn mặc định' },
  lantern_up2: { name: 'Đèn cá chép', price: 500, decayMul: 0.85, visionBonus: 0, desc: 'Lửa giảm chậm hơn 15%' },
  lantern_up3: { name: 'Đèn ông sao', price: 1500, decayMul: 0.7, visionBonus: 40, desc: 'Lửa giảm chậm hơn 30%, tầm nhìn +40' },
};

export const REVIVE_COST = 50;
export const BIOME_LENGTH = 800;
export const STORY_THRESHOLDS = [10, 25, 40];
export const STORY_END_DISTANCE = 4000;

/** Màu đường chạy theo vùng */
export const BIOME_ROAD: Record<string, { road: number; side: number; dash: number }> = {
  village: { road: 0x3a4258, side: 0x232a3f, dash: 0xb8ad8e },
  bamboo: { road: 0x34483d, side: 0x1c2a2a, dash: 0xb7ab86 },
  terraces: { road: 0x4a4636, side: 0x2a3326, dash: 0xc2b48a },
  city: { road: 0x3b3f4c, side: 0x22252f, dash: 0xd0c48a },
  mountain: { road: 0x474a57, side: 0x262a36, dash: 0xb9b3a2 },
};

/** Facebook Instant Games — điền sau khi tạo trên App Dashboard */
export const FB = {
  leaderboard: 'best_distance', // tên bảng xếp hạng (để trống nếu chưa tạo)
  rewardedPlacementId: '', // ví dụ '1234567890_1234567890'
  interstitialPlacementId: '',
  interstitialEveryNDeaths: 3,
};

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/** Định dạng số kiểu Việt Nam: 1240 -> "1.240" */
export function fmt(n: number) {
  return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
