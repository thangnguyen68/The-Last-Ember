// Đa ngôn ngữ: tiếng Anh (mặc định) và tiếng Việt.
import { Save } from './systems/save';
import storyVi from './data/story.json';
import storyEn from './data/story_en.json';

export type Lang = 'en' | 'vi';
export const LANGS: Lang[] = ['en', 'vi'];
export const LANG_LABEL: Record<Lang, string> = { en: 'English', vi: 'Tiếng Việt' };

const en = {
  'game.title': 'The Last Flame',
  'game.title1': 'The Last',
  'game.title2': 'Flame',
  'preload.loading': 'Lighting the lantern… {p}%',

  'menu.hello': 'Hi {name}!',
  'menu.mode': 'Mode: {mode}  ⇄',
  'mode.story': 'Story',
  'mode.endless': 'Endless',
  'menu.start': 'Start running',
  'menu.shop': 'Shop',
  'menu.journey': 'Journey',
  'menu.achievements': 'Records',
  'menu.settings': 'Settings',
  'menu.best': 'Best: {d} m',

  'biome.village': 'Fishing Village',
  'biome.bamboo': 'Bamboo Forest',
  'biome.terraces': 'Rice Terraces',
  'biome.city': 'Abandoned City',
  'biome.mountain': 'Dawn Mountain',
  'game.loop': '{name} · loop {n}',
  'game.needFlame': 'Need at least {n} flame to rescue',
  'game.rescued': 'Villager rescued! +{n}',
  'game.storyUnlocked': 'A new memory unlocked!',

  'pu.pu_magnet': 'Memory Magnet',
  'pu.pu_shield': 'Bamboo Shield',
  'pu.pu_boost': 'Flame Burst',
  'pu.pu_double': 'Double Up',
  'pu.pu_kite': 'Kite Wings',

  'pause.title': 'Paused',
  'pause.memory': 'Memory {n}/3',
  'pause.collect': 'Collect memory shards to unlock\nthis region\'s story ({have}/10)',
  'pause.resume': 'Resume',
  'pause.restart': 'Restart',
  'common.home': 'Back to village',
  'common.on': 'On',
  'common.off': 'Off',
  'common.sound': 'Sound: {v}',
  'common.music': 'Music: {v}',

  'over.flameTitle': 'The flame is out',
  'over.mistTitle': 'The Mist caught you',
  'over.flameSub': 'The flame faded in {biome}. Collect memory shards to keep it alive.',
  'over.mistSub': 'The Mist caught up with you in {biome}. Relight and keep going.',
  'over.distance': 'Distance',
  'over.shards': 'Memory shards',
  'over.fireflies': 'Fireflies earned',
  'over.villagers': 'Villagers rescued',
  'over.newBest': '★ New record!',
  'over.reviveAd': 'Relight (watch ad)',
  'over.revive': 'Relight ({n} fireflies)',
  'over.adIncomplete': 'Ad was not completed',
  'over.revived': 'Already relit this run',
  'over.restart': 'Run again',
  'over.share': 'Share',
  'over.shareText': 'I ran {d} m in The Last Flame. Can you beat me?',
  'over.shareFbOnly': 'Sharing is only available on Facebook',

  'shop.title': 'Shop',
  'shop.sub': 'A better lantern keeps the flame alive longer',
  'shop.equipped': 'Equipped',
  'shop.equip': 'Equip',
  'shop.price': '{p} fireflies',
  'shop.notEnough': 'Not enough fireflies',
  'lantern.lantern_up1': 'Paper Lantern',
  'lantern.lantern_up2': 'Carp Lantern',
  'lantern.lantern_up3': 'Star Lantern',
  'lanternDesc.lantern_up1': 'Default lantern',
  'lanternDesc.lantern_up2': 'Flame burns 15% slower',
  'lanternDesc.lantern_up3': 'Flame burns 30% slower, vision +40',

  'journey.title': 'Journey',
  'journey.progress': 'Memory shards: {s} · Story {n}/3',
  'journey.locked': 'Unlocks at {m} m',
  'journey.need': 'Needs {n} memory shards in this region',
  'journey.endings': 'Endings',
  'journey.endingA': 'A · Burn the flame: {s}',
  'journey.endingB': 'B · Return the memories: {s}',
  'journey.reached': 'Reached',

  'ach.title': 'Records',
  'ach.best': 'Best distance',
  'ach.total': 'Total distance',
  'ach.runs': 'Runs',
  'ach.shards': 'Memory shards collected',
  'ach.villagers': 'Villagers rescued',
  'ach.leaderboard': 'Friends leaderboard',
  'ach.loading': 'Loading…',
  'ach.playOnFb': 'Play on Facebook to compete with friends',
  'ach.empty': 'No one here yet. Invite your friends!',
  'ach.invite': 'Invite friends',
  'ach.inviteText': 'My record is {d} m. Come run with me!',
  'ach.inviteFail': 'Could not send the invite',

  'settings.title': 'Settings',
  'settings.language': 'Language: {v}',
  'settings.howTo': 'How to play',
  'settings.help': 'Swipe left / right: change lane\nSwipe up: jump · Swipe down: slide\nCollect memory shards to keep the flame (+15)\nHitting obstacles: −25 flame, the Mist closes in\nRun next to stone villagers with flame ≥ 50 to rescue them\nKeyboard: ← → ↑ ↓ / Space, P to pause',
  'settings.reset': 'Reset game data',
  'settings.resetConfirm': 'Tap again to confirm',
  'settings.resetDone': 'Data reset',

  'end.title': 'Dawn Mountain Summit',
  'end.intro': 'The Mist blocks the sleeping sun.\nLam must choose:',
  'end.choiceA': 'A. Burn the flame',
  'end.choiceB': 'B. Return the memories',
  'end.stats': 'Distance: {d} m · Villagers rescued: {v}',
  'end.aTitle': 'The sun rises',
  'end.aText': 'The Mist fades away. Everyone wakes up…\nbut all their sad memories are forgotten.',
  'end.bTitle': 'Memories returned',
  'end.bText': 'The sun rises slowly. Each memory finds its way home.',
  'end.voice': '"Lam, dear."',
};

type Key = keyof typeof en;

const vi: Record<Key, string> = {
  'game.title': 'Ngọn Lửa Cuối Cùng',
  'game.title1': 'Ngọn Lửa',
  'game.title2': 'Cuối Cùng',
  'preload.loading': 'Đang thắp đèn… {p}%',

  'menu.hello': 'Chào {name}!',
  'menu.mode': 'Chế độ: {mode}  ⇄',
  'mode.story': 'Câu chuyện',
  'mode.endless': 'Vô tận',
  'menu.start': 'Bắt đầu chạy',
  'menu.shop': 'Cửa hàng',
  'menu.journey': 'Hành trình',
  'menu.achievements': 'Thành tích',
  'menu.settings': 'Cài đặt',
  'menu.best': 'Kỷ lục: {d} m',

  'biome.village': 'Làng chài',
  'biome.bamboo': 'Rừng tre',
  'biome.terraces': 'Ruộng bậc thang',
  'biome.city': 'Thành phố bỏ hoang',
  'biome.mountain': 'Núi Rạng',
  'game.loop': '{name} · vòng {n}',
  'game.needFlame': 'Cần ít nhất {n} lửa để giải cứu',
  'game.rescued': 'Đã giải cứu dân làng! +{n}',
  'game.storyUnlocked': 'Mở khóa một mảnh ký ức mới!',

  'pu.pu_magnet': 'Nam châm ký ức',
  'pu.pu_shield': 'Khiên tre',
  'pu.pu_boost': 'Bùng lửa',
  'pu.pu_double': 'Nhân đôi',
  'pu.pu_kite': 'Cánh diều',

  'pause.title': 'Tạm dừng',
  'pause.memory': 'Ký ức {n}/3',
  'pause.collect': 'Nhặt mảnh ký ức để mở truyện của vùng này\n({have}/10)',
  'pause.resume': 'Tiếp tục',
  'pause.restart': 'Chạy lại',
  'common.home': 'Về làng',
  'common.on': 'Bật',
  'common.off': 'Tắt',
  'common.sound': 'Âm thanh: {v}',
  'common.music': 'Nhạc: {v}',

  'over.flameTitle': 'Ngọn lửa đã tắt',
  'over.mistTitle': 'Bóng Mờ đã tới',
  'over.flameSub': 'Đốm lửa lụi tàn ở {biome}. Nhặt mảnh ký ức để giữ lửa nhé.',
  'over.mistSub': 'Bóng Mờ đã đuổi kịp ở {biome}. Hãy thắp lại và đi tiếp.',
  'over.distance': 'Quãng đường',
  'over.shards': 'Mảnh ký ức',
  'over.fireflies': 'Đom đóm nhận được',
  'over.villagers': 'Dân làng đã cứu',
  'over.newBest': '★ Kỷ lục mới!',
  'over.reviveAd': 'Thắp lại (xem quảng cáo)',
  'over.revive': 'Thắp lại ({n} đom đóm)',
  'over.adIncomplete': 'Chưa xem hết quảng cáo',
  'over.revived': 'Đã thắp lại lượt này',
  'over.restart': 'Chạy lại từ đầu',
  'over.share': 'Chia sẻ',
  'over.shareText': 'Mình đã chạy {d} m trong Ngọn Lửa Cuối Cùng. Bạn vượt qua được không?',
  'over.shareFbOnly': 'Chia sẻ chỉ khả dụng trên Facebook',

  'shop.title': 'Cửa hàng',
  'shop.sub': 'Đèn tốt giúp ngọn lửa cháy bền hơn',
  'shop.equipped': 'Đang dùng',
  'shop.equip': 'Trang bị',
  'shop.price': '{p} đom đóm',
  'shop.notEnough': 'Chưa đủ đom đóm',
  'lantern.lantern_up1': 'Đèn giấy dó',
  'lantern.lantern_up2': 'Đèn cá chép',
  'lantern.lantern_up3': 'Đèn ông sao',
  'lanternDesc.lantern_up1': 'Đèn mặc định',
  'lanternDesc.lantern_up2': 'Lửa giảm chậm hơn 15%',
  'lanternDesc.lantern_up3': 'Lửa giảm chậm hơn 30%, tầm nhìn +40',

  'journey.title': 'Hành trình',
  'journey.progress': 'Mảnh ký ức: {s} · Truyện {n}/3',
  'journey.locked': 'Mở khi chạy tới {m} m',
  'journey.need': 'Cần {n} mảnh ký ức ở vùng này',
  'journey.endings': 'Kết thúc',
  'journey.endingA': 'A · Đốt ngọn lửa: {s}',
  'journey.endingB': 'B · Trả lại ký ức: {s}',
  'journey.reached': 'Đã đạt',

  'ach.title': 'Thành tích',
  'ach.best': 'Kỷ lục quãng đường',
  'ach.total': 'Tổng quãng đường',
  'ach.runs': 'Số lượt chạy',
  'ach.shards': 'Mảnh ký ức đã nhặt',
  'ach.villagers': 'Dân làng đã cứu',
  'ach.leaderboard': 'Bảng xếp hạng bạn bè',
  'ach.loading': 'Đang tải…',
  'ach.playOnFb': 'Chơi trên Facebook để so tài với bạn bè',
  'ach.empty': 'Chưa có ai trong bảng. Hãy mời bạn bè!',
  'ach.invite': 'Mời bạn bè',
  'ach.inviteText': 'Kỷ lục của mình là {d} m. Vào chạy cùng nhé!',
  'ach.inviteFail': 'Chưa gửi được lời mời',

  'settings.title': 'Cài đặt',
  'settings.language': 'Ngôn ngữ: {v}',
  'settings.howTo': 'Cách chơi',
  'settings.help': 'Vuốt trái / phải: đổi làn\nVuốt lên: nhảy · Vuốt xuống: trượt\nNhặt mảnh ký ức để giữ lửa (+15)\nVa chướng ngại: −25 lửa, Bóng Mờ áp sát\nChạy sát dân làng hóa đá khi lửa ≥ 50 để cứu họ\nBàn phím: ← → ↑ ↓ / Space, P để tạm dừng',
  'settings.reset': 'Xóa dữ liệu chơi',
  'settings.resetConfirm': 'Nhấn lần nữa để xác nhận',
  'settings.resetDone': 'Đã xóa dữ liệu',

  'end.title': 'Đỉnh Núi Rạng',
  'end.intro': 'Bóng Mờ chắn trước mặt trời đang ngủ.\nLam phải chọn:',
  'end.choiceA': 'A. Đốt ngọn lửa',
  'end.choiceB': 'B. Trả lại ký ức',
  'end.stats': 'Quãng đường: {d} m · Dân làng đã cứu: {v}',
  'end.aTitle': 'Mặt trời mọc',
  'end.aText': 'Bóng Mờ tan biến. Mọi người tỉnh lại…\nnhưng đã quên hết những ký ức buồn.',
  'end.bTitle': 'Trả lại ký ức',
  'end.bText': 'Mặt trời mọc thật chậm. Ký ức trở về với từng người.',
  'end.voice': '"Lam ơi."',
};

const DICT: Record<Lang, Record<Key, string>> = { en, vi };
const STORY: Record<Lang, Record<string, string[]>> = { en: storyEn, vi: storyVi };

export function getLang(): Lang {
  const l = Save.data.settings.lang;
  return l === 'vi' ? 'vi' : 'en';
}

export function setLang(l: Lang) {
  Save.data.settings.lang = l;
  Save.write();
  applyDocumentLang();
}

export function applyDocumentLang() {
  document.documentElement.lang = getLang();
  document.title = t('game.title');
}

/** Dịch theo khóa; {name} trong chuỗi được thay bằng params.name. */
export function t(key: Key | string, params: Record<string, string | number> = {}): string {
  const s = DICT[getLang()][key as Key] ?? en[key as Key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`));
}

export function story(biome: string): string[] {
  return STORY[getLang()][biome] ?? [];
}
