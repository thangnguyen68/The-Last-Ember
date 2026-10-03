# SESSION STATE — Ngọn Lửa Cuối Cùng (Facebook Instant Game)

Cập nhật: 2026-10-02

## Yêu cầu ban đầu
Dựa vào các file trong thư mục (`GDD.md`, `README.md`, `manifest.json`, `assets/`, `fonts/`, `reference/`), tạo một game để triển khai và chạy trên Facebook.

## Trạng thái: ĐÃ HOÀN THÀNH bản v1.1 (chưa test trên Facebook thật)

### v1.2 — Quảng cáo đổi vật phẩm + sửa mời bạn bè
- Cửa hàng có 2 tab: Đèn lồng / Vật phẩm. Tab Vật phẩm: xem quảng cáo +50 đom đóm (tối đa 10 lần/ngày, `AD_REWARD`), 5 vật phẩm (`SHOP_ITEMS`) mua bằng đom đóm hoặc xem quảng cáo, tối đa 9 cái mỗi loại.
- Vật phẩm đã mua tự dùng khi bắt đầu lượt chạy (`GameScene.useStartItems`, mỗi loại 1 cái). Save thêm `items`, `adDay`, `adCount`.
- `Platform.showRewarded()` trả về `'ok' | 'cancelled' | 'unavailable'`, tải quảng cáo ngay khi cần (10 s) nếu chưa có sẵn; `rewardedAvailable`. Khi `npm run dev` ngoài FB thì giả lập quảng cáo (`FB.mockAdsInDev`).
- Sửa luôn lỗi hồi sinh: trước đây chỉ kiểm tra true/false, nay phải xem hết quảng cáo mới được hồi sinh.
- Mời bạn bè: `fbapp-config.json` thêm `custom_update_templates.invite` (trước đây thiếu nên `updateAsync` lỗi). Thử `inviteAsync` trước, dự phòng bằng `chooseAsync` + `updateAsync`. Text gửi dạng LocalizableContent. Huỷ (USER_INPUT) không báo lỗi; lỗi khác hiện kèm mã lỗi.
- Ảnh chia sẻ/mời tạo riêng 1200×627 JPEG (`systems/shareImage.ts`, khoảng 67 KB) thay cho chụp toàn màn hình.
- Bảng xếp hạng không tải được thì hiện "chưa sẵn sàng" thay vì đứng "Loading…".
- Đã test: Cửa hàng (dev, quảng cáo giả lập); mời bạn bè trên FB giả lập theo cả 2 đường (inviteAsync / chooseAsync + updateAsync).

### v1.1.1 — Sửa lỗi kẹt 0% khi tải trên Facebook
- Nguyên nhân chính: `initializeAsync` bị timeout 5 s → coi như chạy web → không gọi `setLoadingProgress`/`startGameAsync` → màn tải FB đứng 0%.
- Sửa (`platform.ts`): nhận diện host Facebook (`*.fbsbx.com`, `facebook.com`, hoặc iframe không phải localhost) → chờ tới 30 s; ngoài FB chỉ chờ 3 s. Tiến trình tải không bao giờ tụt ngược.
- Build đổi sang IIFE + `<script defer>` (plugin `classicScript` trong `vite.config.ts`, `target: es2018`), bỏ `type="module" crossorigin`.
- `main.ts`: lớp báo lỗi đỏ trên màn hình (`showFatal`) cho `error`/`unhandledrejection`/lỗi boot, đồng thời gọi `startGameAsync` để màn tải FB tắt và thấy được lỗi; watchdog 40 s. `PreloadScene` log file tải lỗi; `BootScene` báo lỗi nếu thiếu manifest.
- Đã test bằng giả lập (Playwright phục vụ dist dưới `apps-123.apps.fbsbx.com` + SDK giả): init 7 s → vào game; thiếu manifest → hiện lớp báo lỗi.

### v1.1 — Đa ngôn ngữ (English mặc định / Tiếng Việt)
- `src/i18n.ts`: từ điển `en` + `vi`, hàm `t(key, params)`, `story(biome)`, `getLang/setLang`, `applyDocumentLang()` (đổi `<html lang>` và tiêu đề tab).
- `src/data/story_en.json`: bản dịch tiếng Anh của cốt truyện (`story.json` vẫn là bản tiếng Việt).
- Ngôn ngữ lưu ở `Save.data.settings.lang`, mặc định `'en'`.
- Chọn ngôn ngữ ở 2 chỗ: nút pill EN/VI góc trái trên Menu, và nút "Language" trong Cài đặt.
- Mọi scene dùng `t()`; tên vùng / vật phẩm / đèn lấy theo key (`biome.*`, `pu.*`, `lantern.*`). `RunStats.biomeName` đã đổi thành `biomeId`.
- Tên game tiếng Anh: "The Last Flame". Đã test bằng Playwright: chuyển EN↔VI, ngôn ngữ được lưu, không có lỗi.


### Công nghệ
- Phaser 3.90 + TypeScript 7 + Vite 8, archiver 8 (đóng gói zip).
- Độ phân giải logic 390×844, `Scale.FIT`, camera zoom theo DPR (tối đa 2) để hình và chữ sắc nét.
- Facebook Instant Games SDK `fbinstant.7.1.js` (nạp trong `index.html`). Phiên bản này **chưa được xác minh** là bản mới nhất.

### Cấu trúc đã tạo
```
index.html              font @font-face + thẻ script FB SDK
vite.config.ts          base './', assetsDir 'js', plugin copy assets/fonts/manifest/fbapp-config sang dist (bỏ SVG)
fbapp-config.json       PORTRAIT, RICH_GAMEPLAY, NAV_FLOATING
scripts/zip.mjs         dist/ -> ngon-lua-cuoi-cung-fb.zip (dùng { ZipArchive } của archiver v8)
DEPLOY_FACEBOOK.md      hướng dẫn deploy lên Facebook
.gitignore
src/
  main.ts               init Platform -> nạp Save -> chờ font -> tạo Phaser.Game (DEV: window.__game)
  config.ts             MỌI con số gameplay, màu sắc, giá đèn, cấu hình FB (leaderboard, placement ID)
  data/story.json       15 đoạn truyện placeholder (3 đoạn × 5 vùng)
  systems/platform.ts   lớp bọc FBInstant, có fallback khi chạy ngoài Facebook
  systems/save.ts       localStorage key `nlcc_save` + FB player data, lấy bản có updatedAt mới hơn
  systems/audio.ts      SFX + nhạc nền tổng hợp bằng WebAudio (placeholder, thang ngũ cung)
  systems/assets.ts     truy cập manifest, addAsset/applyDef (anchor + scale theo size @1x)
  ui/ui.ts              BaseScene (zoom camera), text, panel, Button, roundButton, iconButton, toast
  scenes/               Boot, Preload, Menu, Game, Pause, GameOver, Shop, Journey, Achievements, Settings, Ending
```

### Gameplay đã làm (theo GDD)
- Đường chạy 3 làn giả 3D (chân trời y=360, Lam ở y=780, viewDist 55 m, depth tuyến tính). Đổi làn / nhảy / trượt; vuốt xuống khi đang nhảy thì rơi nhanh rồi trượt.
- Tốc độ 8 → 20 m/s (chế độ Vô tận tăng trần +2 mỗi vòng, tối đa 28).
- Lửa giảm 2/s; mảnh ký ức +15; va chạm −25. Tầm nhìn dùng RenderTexture và xóa một lỗ sáng có bán kính lerp(140, 520).
- Bóng Mờ mức 0–3: mức 3 là thua; sau 15 giây không va chạm thì giảm 1 mức; mức 2 có viền xám và nhạc chậm 10%.
- 4 kiểu chướng ngại `jump/slide/lane/slow`. Sinh hàng mỗi 18–28 m, luôn chừa ít nhất 1 làn trống, có hệ thống giữ chỗ làn để chuỗi vật phẩm không chồng lên chướng ngại.
- Mảnh ký ức, đom đóm, dân làng hóa đá (cứu khi lửa ≥ 50: tốn 20 lửa, thưởng 10 đom đóm), 5 vật phẩm hỗ trợ có vòng đếm ngược trên HUD.
- 5 vùng đất, mỗi vùng 800 m, có chuyển nền mờ dần và hiện tên vùng. Mở truyện ở mốc 10/25/40 mảnh ký ức (cộng dồn qua các lượt).
- Chế độ Câu chuyện: tới 4.000 m thì vào EndingScene (kết thúc A/B, lưu `endingsSeen`).
- Màn thua: thắp lại tốn 50 đom đóm, hoặc xem quảng cáo có thưởng nếu có sẵn; mỗi lượt chỉ 1 lần. Có nút chia sẻ ảnh chụp màn hình.
- Cửa hàng 3 mẫu đèn (0 / 500 / 1.500 đom đóm). Hành trình (vùng đất, truyện, kết thúc). Thành tích (thống kê + bảng xếp hạng bạn bè FB + mời bạn bè). Cài đặt (âm thanh, nhạc, cách chơi, xóa dữ liệu).
- Tự tạm dừng khi cửa sổ mất focus hoặc khi FB gọi onPause.

### Đã kiểm tra
- `tsc --noEmit` và `npm run build` chạy không lỗi.
- Playwright (khung 390×844): chụp màn hình mọi scene; chạy thử 25 giây với thao tác ngẫu nhiên không có lỗi runtime; vuốt đổi làn hoạt động. Va chạm, nhặt vật phẩm và hồi lửa đều hoạt động.
- Bản production (`vite preview`) chạy được ngoài Facebook.
- File zip: 1,67 MB, 108 file; `index.html`, `fbapp-config.json`, `manifest.json` ở gốc; đường dẫn không chứa `\`.

### Chưa làm / việc tiếp theo
1. **Chưa test trên Facebook thật**: tạo app Gaming → Instant Games, upload zip ở Web Hosting, chuyển sang Testing.
2. Tạo leaderboard `best_distance` trên dashboard.
3. Điền `FB.rewardedPlacementId` và `FB.interstitialPlacementId` trong `src/config.ts` (nếu muốn có quảng cáo).
4. Xác minh phiên bản SDK FBInstant mới nhất.
5. Thay âm thanh placeholder bằng file âm thanh thật; thay văn bản truyện trong `story.json`.
6. Có thể cải thiện: chưa có sprite trượt nhìn từ sau (đang co chiều cao còn 60%); khi nhảy dùng sprite nhìn ngang `lam_jump` theo đúng GDD; font bị nhân bản trong `dist/js` (thừa khoảng 480 KB, không ảnh hưởng chạy).

### Lệnh
```bash
npm install
npm run dev          # http://localhost:5173
npm run build
npm run package:fb   # build + tạo ngon-lua-cuoi-cung-fb.zip
```

### Ghi chú kỹ thuật
- Thư mục `assets/` của game trùng tên với thư mục output mặc định của Vite, vì vậy JS/CSS build ra được đặt trong `dist/js/`.
- Không đổi tên file asset nào; mọi asset được nạp qua `manifest.json` (key = id asset).
- Hồi sinh: `GameScene.revive()` trừ lại phần thống kê đã cộng để không đếm trùng; đom đóm được cộng theo phần chênh lệch (`committedFireflies`).
