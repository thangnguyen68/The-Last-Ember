# Triển khai "Ngọn Lửa Cuối Cùng" lên Facebook Instant Games

## 1. Chạy thử trên máy

```bash
npm install
npm run dev          # mở http://localhost:5173 (dùng DevTools chế độ điện thoại 390×844)
```

Ngoài Facebook, game tự chạy ở chế độ web thường (lưu bằng localStorage, ẩn bảng xếp hạng/quảng cáo).

## 2. Đóng gói

```bash
npm run package:fb   # = build + nén → ngon-lua-cuoi-cung-fb.zip
```

File zip có `index.html` và `fbapp-config.json` ở gốc, đúng cấu trúc Facebook yêu cầu.

## 3. Tạo app trên Facebook

1. Vào https://developers.facebook.com/apps → **Create App** → chọn loại **Gaming** → sản phẩm **Instant Games**.
2. **Instant Games → Details**: điền tên, danh mục, mô tả; tải icon (`assets/branding/app_icon.png`, 1024×1024) và ảnh bìa.
3. **Instant Games → Web Hosting** → **Upload Version** → chọn file zip → khi trạng thái là *Standby*, bấm ★ để chuyển sang **Testing**.
4. Mở game để test trên điện thoại (Facebook / Messenger) hoặc qua link *Play* trong dashboard.
5. Khi ổn định: **Push to Production**, rồi gửi **App Review** để phát hành công khai.

## 4. Tính năng Facebook đã tích hợp (`src/systems/platform.ts`)

| Tính năng | API | Cần cấu hình |
|---|---|---|
| Màn tải & tiến trình | `initializeAsync`, `setLoadingProgress`, `startGameAsync` | — |
| Lưu dữ liệu đám mây | `player.getDataAsync / setDataAsync` (key `nlcc_save`) | — |
| Tên người chơi ở menu | `player.getName()` | — |
| Bảng xếp hạng bạn bè | `getLeaderboardAsync('best_distance')` | Tạo leaderboard tên `best_distance` (Instant Games → Leaderboards, sort *Higher is better*, không gắn context) |
| Chia sẻ kết quả | `shareAsync` (ảnh chụp màn hình thua) | — |
| Mời bạn bè | `inviteAsync` (hoặc `context.chooseAsync` + `updateAsync`) | — |
| Quảng cáo có thưởng để hồi sinh | `getRewardedVideoAsync` | Điền `FB.rewardedPlacementId` trong `src/config.ts` |
| Quảng cáo xen kẽ (mỗi 3 lần thua) | `getInterstitialAdAsync` | Điền `FB.interstitialPlacementId` |

Placement ID lấy ở **Monetization Manager** sau khi app được duyệt kiếm tiền.

## 5. Cân chỉnh

Mọi con số gameplay (tốc độ, lửa, Bóng Mờ, tần suất sinh vật thể, giá đèn…) nằm trong `src/config.ts`.
Văn bản cốt truyện placeholder: `src/data/story.json`. Âm thanh hiện là placeholder tổng hợp bằng WebAudio (`src/systems/audio.ts`).
