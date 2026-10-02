// Lớp tích hợp Facebook Instant Games. Khi chạy ngoài Facebook mọi hàm đều có fallback an toàn.
import { FB } from '../config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const FBInstant: any;

export interface LeaderEntry {
  rank: number;
  name: string;
  score: number;
  isMe: boolean;
}

let fbReady = false;
let started = false;
let maxProgress = 0;
let preloadedRewarded: any = null;
let preloadedInterstitial: any = null;

function hasSdk() {
  return typeof FBInstant !== 'undefined';
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

export const Platform = {
  get isFB() {
    return fbReady;
  },

  /** Đang chạy trong môi trường Facebook (host fbsbx.com / facebook.com, hoặc trong iframe không phải localhost). */
  get onFacebookHost() {
    const h = location.hostname;
    if (/(^|\.)fbsbx\.com$|(^|\.)facebook\.com$/.test(h)) return true;
    let inIframe = false;
    try { inIframe = window.self !== window.top; } catch { inIframe = true; }
    return inIframe && h !== 'localhost' && h !== '127.0.0.1';
  },

  /**
   * Gọi trước khi tạo game.
   * - Trên Facebook: chờ initializeAsync tới 30 s (KHÔNG coi là web chỉ vì mạng chậm — trước đây
   *   timeout 5 s khiến startGameAsync không bao giờ được gọi → màn tải Facebook kẹt 0%).
   * - Ngoài Facebook: thử nhanh 3 s rồi chạy chế độ web.
   */
  async init() {
    if (!hasSdk()) {
      if (this.onFacebookHost) console.error('[FB] Không tải được FBInstant SDK');
      return;
    }
    try {
      await withTimeout(FBInstant.initializeAsync(), this.onFacebookHost ? 30000 : 3000);
      fbReady = true;
      this.setLoadingProgress(0.02);
    } catch (e) {
      fbReady = false;
      if (this.onFacebookHost) console.error('[FB] initializeAsync thất bại', e);
    }
  },

  setLoadingProgress(p: number) {
    if (fbReady) {
      // Không cho tiến trình tụt ngược
      maxProgress = Math.max(maxProgress, Math.min(100, Math.round(p * 100)));
      try { FBInstant.setLoadingProgress(maxProgress); } catch { /* ignore */ }
    }
  },

  async start() {
    if (!fbReady || started) return;
    started = true;
    try {
      await FBInstant.startGameAsync();
      FBInstant.onPause?.(() => window.dispatchEvent(new Event('fb-pause')));
    } catch (e) {
      console.error('[FB] startGameAsync thất bại', e);
    }
    this.preloadAds();
  },

  playerName(): string {
    if (!fbReady) return '';
    try { return FBInstant.player.getName() || ''; } catch { return ''; }
  },

  async loadData(key: string): Promise<string | null> {
    if (!fbReady) return null;
    try {
      const data = await withTimeout(FBInstant.player.getDataAsync([key]), 4000) as Record<string, string>;
      return data?.[key] ?? null;
    } catch {
      return null;
    }
  },

  saveData(key: string, value: string) {
    if (!fbReady) return;
    try { FBInstant.player.setDataAsync({ [key]: value }).catch(() => {}); } catch { /* ignore */ }
  },

  async submitScore(score: number) {
    if (!fbReady || !FB.leaderboard) return;
    try {
      const lb = await FBInstant.getLeaderboardAsync(FB.leaderboard);
      await lb.setScoreAsync(Math.floor(score));
    } catch { /* bảng xếp hạng chưa được tạo trên dashboard */ }
  },

  async getLeaderboard(): Promise<LeaderEntry[] | null> {
    if (!fbReady || !FB.leaderboard) return null;
    try {
      const lb = await FBInstant.getLeaderboardAsync(FB.leaderboard);
      const myId = FBInstant.player.getID();
      const entries = await lb.getConnectedPlayerEntriesAsync(10, 0);
      return entries.map((e: any) => ({
        rank: e.getRank(),
        name: e.getPlayer().getName(),
        score: e.getScore(),
        isMe: e.getPlayer().getID() === myId,
      }));
    } catch {
      return null;
    }
  },

  /** Chia sẻ thành tích. image là data URL base64 (PNG/JPEG). */
  async share(text: string, image: string): Promise<boolean> {
    if (fbReady) {
      try {
        await FBInstant.shareAsync({ intent: 'SHARE', image, text, data: { from: 'share' } });
        return true;
      } catch {
        return false;
      }
    }
    if (navigator.share) {
      try { await navigator.share({ title: 'Ngọn Lửa Cuối Cùng', text, url: location.href }); return true; } catch { return false; }
    }
    return false;
  },

  async inviteFriends(text: string, image: string) {
    if (!fbReady) return false;
    try {
      if (FBInstant.inviteAsync) {
        await FBInstant.inviteAsync({ image, text, data: { from: 'invite' } });
      } else {
        await FBInstant.context.chooseAsync();
        await FBInstant.updateAsync({ action: 'CUSTOM', cta: 'Chơi ngay', image, text, template: 'invite', strategy: 'IMMEDIATE' });
      }
      return true;
    } catch {
      return false;
    }
  },

  preloadAds() {
    if (!fbReady) return;
    if (FB.rewardedPlacementId && !preloadedRewarded) {
      FBInstant.getRewardedVideoAsync(FB.rewardedPlacementId)
        .then((ad: any) => ad.loadAsync().then(() => { preloadedRewarded = ad; }))
        .catch(() => {});
    }
    if (FB.interstitialPlacementId && !preloadedInterstitial) {
      FBInstant.getInterstitialAdAsync(FB.interstitialPlacementId)
        .then((ad: any) => ad.loadAsync().then(() => { preloadedInterstitial = ad; }))
        .catch(() => {});
    }
  },

  get rewardedReady() {
    return !!preloadedRewarded;
  },

  /** Trả về true nếu người chơi xem hết quảng cáo có thưởng. */
  async showRewarded(): Promise<boolean> {
    if (!preloadedRewarded) return false;
    const ad = preloadedRewarded;
    preloadedRewarded = null;
    try {
      await ad.showAsync();
      return true;
    } catch {
      return false;
    } finally {
      this.preloadAds();
    }
  },

  async showInterstitial() {
    if (!preloadedInterstitial) return;
    const ad = preloadedInterstitial;
    preloadedInterstitial = null;
    try { await ad.showAsync(); } catch { /* ignore */ }
    this.preloadAds();
  },
};
