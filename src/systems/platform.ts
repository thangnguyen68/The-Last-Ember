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
let loadingRewarded: Promise<void> | null = null;
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

  /** Chia sẻ thành tích. image là data URL base64 (nên dùng makeShareImage để ảnh nhỏ gọn). */
  async share(text: string, image: string): Promise<SocialResult> {
    if (fbReady) {
      try {
        await FBInstant.shareAsync({ intent: 'SHARE', image, text, data: { from: 'share' } });
        return { ok: true };
      } catch (e) {
        return fail(e);
      }
    }
    if (navigator.share) {
      try { await navigator.share({ title: document.title, text, url: location.href }); return { ok: true }; } catch (e) { return fail(e); }
    }
    return { ok: false, code: 'NOT_FB' };
  },

  /**
   * Mời bạn bè. Thứ tự thử:
   * 1. inviteAsync (SDK mới, hộp thoại mời của Facebook)
   * 2. context.chooseAsync + updateAsync (template "invite" khai báo trong fbapp-config.json)
   */
  async inviteFriends(text: string, image: string): Promise<SocialResult> {
    if (!fbReady) return { ok: false, code: 'NOT_FB' };
    const content = { default: text };
    let supported: string[] = [];
    try { supported = FBInstant.getSupportedAPIs?.() ?? []; } catch { /* ignore */ }
    const canInvite = typeof FBInstant.inviteAsync === 'function' && (!supported.length || supported.includes('inviteAsync'));

    if (canInvite) {
      try {
        await FBInstant.inviteAsync({ image, text: content, data: { from: 'invite' } });
        return { ok: true };
      } catch (e) {
        const r = fail(e);
        if (r.code === 'USER_INPUT') return r; // người chơi đóng hộp thoại
        console.warn('[FB] inviteAsync lỗi, thử chooseAsync', e);
      }
    }
    try {
      await FBInstant.context.chooseAsync();
    } catch (e) {
      return fail(e);
    }
    try {
      await FBInstant.updateAsync({
        action: 'CUSTOM',
        template: 'invite',
        cta: { default: 'Play' },
        image,
        text: content,
        data: { from: 'invite' },
        strategy: 'IMMEDIATE',
        notification: 'NO_PUSH',
      });
      return { ok: true };
    } catch (e) {
      return fail(e);
    }
  },

  // ------------------------------------------------------------------ Quảng cáo

  preloadAds() {
    if (!fbReady) return;
    if (FB.rewardedPlacementId && !preloadedRewarded && !loadingRewarded) {
      loadingRewarded = loadRewarded().then((ad) => { preloadedRewarded = ad; }, () => {}).finally(() => { loadingRewarded = null; });
    }
    if (FB.interstitialPlacementId && !preloadedInterstitial) {
      FBInstant.getInterstitialAdAsync(FB.interstitialPlacementId)
        .then((ad: any) => ad.loadAsync().then(() => { preloadedInterstitial = ad; }))
        .catch(() => {});
    }
  },

  /** Có thể hiện quảng cáo có thưởng không (đã cấu hình placement, hoặc chế độ giả lập khi dev). */
  get rewardedAvailable() {
    return (fbReady && !!FB.rewardedPlacementId) || mockAds();
  },

  get rewardedReady() {
    return !!preloadedRewarded || mockAds();
  },

  /**
   * Hiện quảng cáo có thưởng. Nếu chưa tải sẵn thì tải ngay (tối đa 10 s).
   * 'ok' = xem hết → trao thưởng; 'cancelled' = đóng sớm; 'unavailable' = không có quảng cáo.
   */
  async showRewarded(): Promise<AdResult> {
    if (mockAds()) {
      console.info('[Ads] Giả lập quảng cáo có thưởng (DEV)');
      await new Promise((r) => setTimeout(r, 900));
      return 'ok';
    }
    if (!fbReady || !FB.rewardedPlacementId) return 'unavailable';
    let ad = preloadedRewarded;
    preloadedRewarded = null;
    if (!ad) {
      try {
        ad = await withTimeout(loadingRewarded ? loadingRewarded.then(() => { const a = preloadedRewarded; preloadedRewarded = null; if (!a) throw new Error('no ad'); return a; }) : loadRewarded(), 10000);
      } catch (e) {
        console.warn('[Ads] không tải được quảng cáo', e);
        this.preloadAds();
        return 'unavailable';
      }
    }
    try {
      await ad.showAsync();
      return 'ok';
    } catch (e: any) {
      console.warn('[Ads] showAsync lỗi', e);
      return e?.code === 'USER_INPUT' ? 'cancelled' : 'unavailable';
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

export type AdResult = 'ok' | 'cancelled' | 'unavailable';

export interface SocialResult {
  ok: boolean;
  /** Mã lỗi FBInstant (USER_INPUT = người chơi tự huỷ) */
  code?: string;
}

function fail(e: any): SocialResult {
  const code = e?.code ?? (e?.name === 'AbortError' ? 'USER_INPUT' : e?.message ?? 'UNKNOWN');
  if (code !== 'USER_INPUT') console.warn('[FB] lỗi', code, e);
  return { ok: false, code };
}

function loadRewarded(): Promise<any> {
  return FBInstant.getRewardedVideoAsync(FB.rewardedPlacementId).then((ad: any) => ad.loadAsync().then(() => ad));
}

/** Khi dev (npm run dev) ngoài Facebook: giả lập quảng cáo để test luồng nhận thưởng. */
function mockAds() {
  return !fbReady && import.meta.env.DEV && FB.mockAdsInDev;
}
