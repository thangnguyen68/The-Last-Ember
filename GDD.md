# Ngọn Lửa Cuối Cùng — Tài liệu thiết kế game (GDD)

Tài liệu này là đặc tả để lập trình. Mọi asset được mô tả trong `manifest.json` và nằm trong `assets/`. Ảnh tham chiếu bố cục nằm trong `reference/`.

## 1. Tóm tắt

Endless runner 3 làn, màn hình dọc, chia theo chương. Người chơi điều khiển Lam, cậu bé đưa thư mang chiếc đèn lồng chứa đốm lửa cuối cùng, chạy qua 5 vùng đất để lên đỉnh Núi Rạng thắp lại mặt trời. Bóng Mờ (sương xám nuốt ký ức) đuổi phía sau.

## 2. Nền tảng và công nghệ đề xuất

- Engine: **Phaser 3 + TypeScript + Vite** (chạy trên web, đóng gói mobile sau). Godot 4 cũng phù hợp.
- Độ phân giải thiết kế: **390 × 844** (dọc), co giãn theo `Scale.FIT`, căn giữa.
- Asset: ưu tiên PNG (@2x hoặc @3x, xem `png_scale` và kích thước file). Icon giao diện dùng SVG để tô màu theo trạng thái.
- Phông: `fonts/PatrickHand-Regular.ttf` cho tiêu đề và con số, `fonts/BeVietnamPro-*.ttf` cho chữ thường. Cả hai hỗ trợ đầy đủ tiếng Việt.

## 3. Góc nhìn và đường chạy

Góc nhìn giả 3D từ sau lưng nhân vật (xem `reference/screen_gameplay.png`):

- Đường chạy là hình thang: đường chân trời ở y ≈ 360, đáy ở y = 844. Mép trên rộng 90 px (x 150–240), mép dưới rộng toàn màn hình.
- 3 làn, chỉ số −1, 0, 1. Vị trí x của một vật thể = tâm đường + làn × (độ rộng làn tại độ sâu đó).
- Vật thể sinh ra ở chân trời với tỉ lệ 0.15 rồi tiến lại gần, phóng to tuyến tính đến tỉ lệ 1.0 khi tới hàng của Lam (y ≈ 780). Dùng `depth` (0 = chân trời, 1 = vị trí người chơi) để nội suy cả y, tỉ lệ và độ rộng làn.
- Lam đứng cố định ở y ≈ 780 (điểm neo chân), dùng animation `lam_run_back`.
- Hình nền của vùng đất (`bg_*`) phủ phần trên màn hình, cuộn rất chậm hoặc đứng yên.

Các sprite nhìn ngang (`lam_run_*`, `lam_jump`, `lam_slide`…) dùng cho menu, cảnh cắt truyện và màn thua.

## 4. Điều khiển

| Thao tác | Bàn phím (debug) | Kết quả |
|---|---|---|
| Vuốt trái / phải | ← / → | Đổi làn, tween 120 ms |
| Vuốt lên | ↑ hoặc Space | Nhảy, 600 ms, cao 120 px |
| Vuốt xuống | ↓ | Trượt, 600 ms |

Vuốt xuống khi đang nhảy thì rơi nhanh xuống đất. Nhận vuốt khi độ dài ≥ 30 px.

Khi đang nhảy hiển thị `lam_jump` (lật hoặc dùng bóng đổ để rõ độ cao). Khi trượt, thu nhỏ chiều cao sprite nhìn từ sau còn 60% (chưa có sprite trượt nhìn từ sau).

## 5. Vòng lặp chính và các con số

Tất cả các giá trị dưới đây nên nằm trong một file `config.ts` để dễ cân chỉnh.

**Tốc độ**
- Bắt đầu 8 m/s, tăng 0.1 m/s mỗi giây, tối đa 20 m/s.
- Quãng đường hiển thị bằng mét, định dạng kiểu Việt Nam: `1.240 m`.

**Ngọn lửa (thanh máu + tầm nhìn)**
- `flame` từ 0 đến 100, bắt đầu ở 100.
- Giảm 2 điểm mỗi giây.
- Nhặt mảnh ký ức: +15. Va chướng ngại: −25.
- `flame = 0` là thua.
- Trạng thái đèn theo `manifest.lantern_states`: ≥66 là `lv3`, ≥33 là `lv2`, >0 là `lv1`, 0 là `out`.
- **Tầm nhìn:** phủ một lớp tối lên màn hình với một lỗ sáng tròn quanh Lam. Bán kính = lerp(140 px, 520 px, flame/100). Khi lửa yếu, vật thể ở xa gần như không thấy.

**Bóng Mờ**
- `mistLevel` từ 0 đến 3. Mỗi lần va chạm +1. Sau 15 giây không va chạm thì −1.
- Level 1: hiện `bongmo_far` nhỏ ở mép dưới. Level 2: `bongmo_near` cùng `mist_overlay` cao hơn, viền màn hình chuyển xám, nhạc chậm lại 10%.
- Level 3: Bóng Mờ bắt kịp, thua.
- `mist_overlay` kéo giãn ngang ở mép dưới, chiều cao 60 / 120 / 200 px theo level.

**Va chạm**
- Hitbox mỗi chướng ngại theo trường `action` trong manifest:
  - `jump`: vật thấp, vượt bằng cách nhảy (hoặc đổi làn).
  - `slide`: vật treo cao, vượt bằng cách trượt (hoặc đổi làn).
  - `lane`: chắn cả chiều cao, chỉ né bằng đổi làn.
  - `slow`: không gây sát thương, giảm 30% tốc độ trong 1.5 giây.
- Sau khi va chạm: bất tử 1 giây, nhấp nháy sprite, hiện `lam_hurt` ở góc HUD 300 ms.

**Sinh vật thể**
- Mỗi 18–28 m sinh một "hàng". Một hàng có tối đa 2 chướng ngại, luôn chừa ít nhất 1 làn đi được.
- Chỉ dùng chướng ngại thuộc vùng đất hiện tại (`biomes[].obstacles`).
- Mảnh ký ức xuất hiện theo chuỗi 3–5 cái trên một làn, khoảng 1 chuỗi mỗi 60 m. Loại mảnh chọn ngẫu nhiên.
- Đom đóm: chuỗi 5–8 con, mỗi 40 m. Mỗi con +1 đom đóm (tiền tệ lưu vĩnh viễn).
- Dân làng hóa đá (`villager_stone`) xuất hiện ở bên lề mỗi khoảng 250 m. Chạy sát làn cạnh họ khi `flame ≥ 50` để giải cứu: tốn 20 lửa, thưởng 10 đom đóm và tăng biến đếm `villagersSaved`.

## 6. Vật phẩm hỗ trợ

Sinh ngẫu nhiên khoảng 1 cái mỗi 300 m.

| ID | Tên | Hiệu ứng | Thời gian |
|---|---|---|---|
| `pu_magnet` | Nam châm ký ức | Hút mảnh ký ức và đom đóm ở cả 3 làn | 8 s |
| `pu_shield` | Khiên tre | Chặn 1 lần va chạm | đến khi dùng |
| `pu_boost` | Bùng lửa | Lửa về 100, không giảm | 5 s |
| `pu_double` | Nhân đôi | Đom đóm nhận được ×2 | 10 s |
| `pu_kite` | Cánh diều | Bay trên cao, bỏ qua mọi chướng ngại | 4 s |

Khi đang có hiệu ứng, hiện icon của vật phẩm nhỏ dưới HUD kèm vòng đếm ngược.

## 7. Vùng đất và chương

Theo `manifest.biomes`, mỗi vùng dài 800 m, nối tiếp nhau theo `order`:

1. Làng chài (`bg_village`)
2. Rừng tre (`bg_bamboo`)
3. Ruộng bậc thang (`bg_terraces`)
4. Thành phố bỏ hoang (`bg_city`)
5. Núi Rạng (`bg_mountain`)

Khi chuyển vùng: mờ dần hình nền 1 giây, hiện tên vùng ở giữa màn hình bằng Patrick Hand 2 giây. Sau Núi Rạng (4.000 m), chuyển sang cảnh kết thúc.

**Chế độ chơi:** chế độ Câu chuyện đi tuần tự 5 vùng rồi đến kết thúc. Chế độ Vô tận lặp lại các vùng sau khi xong, tốc độ tiếp tục tăng.

**Mảnh ký ức và cốt truyện:** mỗi vùng có 3 đoạn truyện ngắn, mở khi tổng mảnh ký ức thu được trong vùng đạt 10, 25 và 40. Hiện dạng thẻ chữ ngắn khi tạm dừng hoặc khi thua. Văn bản để trong `story.json`, viết placeholder trước.

## 8. Kết thúc (sau Núi Rạng)

Cảnh tĩnh trên nền `bg_dawn` với `bongmo_boss` ở giữa. Hiện hai lựa chọn:

- **A. Đốt ngọn lửa:** Bóng Mờ tan, mặt trời mọc nhanh. Mọi người tỉnh lại nhưng quên ký ức buồn.
- **B. Trả lại ký ức:** mặt trời mọc chậm. Hiện `ba_awake` và dòng chữ "Lam ơi."

Lưu lại kết thúc đã đạt vào bộ nhớ cục bộ.

## 9. Màn hình

Bám theo ảnh trong `reference/`:

- **Menu** (`screen_menu.png`): logo, Lam `lam_idle`, nút chính "Bắt đầu chạy", 4 nút tròn (Cửa hàng, Hành trình, Thành tích, Cài đặt), số đom đóm góc phải trên.
- **Đang chơi** (`screen_gameplay.png`): nút tạm dừng, thanh lửa, quãng đường, số mảnh ký ức, số đom đóm.
- **Tạm dừng:** lớp phủ mờ với Tiếp tục, Chạy lại, Về làng, bật tắt âm thanh và nhạc.
- **Thua** (`screen_gameover.png`): đèn `lantern_out`, tiêu đề "Ngọn lửa đã tắt", câu nói vùng thua, bảng thống kê. Nút "Thắp lại (50 đom đóm)" hồi sinh tại chỗ với lửa 60 và `mistLevel = 0`, mỗi lượt chỉ dùng 1 lần. Ngoài ra có "Chạy lại từ đầu" và "Về làng".
- **Cửa hàng:** 3 mẫu đèn nâng cấp.

| Đèn | Giá | Hiệu ứng |
|---|---|---|
| `lantern_up1` Đèn giấy dó | mặc định | — |
| `lantern_up2` Đèn cá chép | 500 đom đóm | Lửa giảm chậm hơn 15% |
| `lantern_up3` Đèn ông sao | 1.500 đom đóm | Lửa giảm chậm hơn 30%, tầm nhìn tối thiểu +40 px |

## 10. Lưu trữ

Dùng `localStorage` với key `nlcc_save`, gồm: `fireflies`, `bestDistance`, `ownedLanterns`, `equippedLantern`, `endingsSeen`, `storyUnlocked`, `settings` (âm thanh, nhạc).

## 11. Âm thanh (chưa có file)

Tạo hook sẵn và dùng âm thanh placeholder:
- Nhạc nền mỗi vùng.
- Hiệu ứng: nhặt mảnh ký ức, nhặt đom đóm, nhảy, trượt, va chạm, Bóng Mờ áp sát, đèn tắt.

Phong cách định hướng: sáo trúc, đàn bầu, kết hợp nhịp điện tử.

## 12. Thứ tự làm đề xuất

1. Khung dự án, nạp asset từ `manifest.json`, scale màn hình.
2. Đường chạy giả 3D với 3 làn, Lam chạy, đổi làn, nhảy, trượt.
3. Sinh chướng ngại vật, va chạm.
4. Thanh lửa, tầm nhìn, Bóng Mờ.
5. Mảnh ký ức, đom đóm, vật phẩm hỗ trợ.
6. HUD và các màn hình menu, tạm dừng, thua.
7. Chuyển vùng đất, cốt truyện, kết thúc.
8. Cửa hàng và lưu trữ.
