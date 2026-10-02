# Gói dữ liệu cho agent lập trình — Ngọn Lửa Cuối Cùng

```
ngon-lua-cuoi-cung/
├── README.md          ← file này
├── GDD.md             ← đặc tả gameplay, con số, màn hình
├── manifest.json      ← danh sách asset: kích thước, điểm neo, animation, vùng đất
├── assets/            ← SVG + PNG cho từng hình
│   ├── characters/  lantern/  enemy/  collectibles/  powerups/
│   ├── obstacles/   backgrounds/  branding/  ui/  hud/
├── fonts/             ← Patrick Hand, Be Vietnam Pro (giấy phép OFL)
└── reference/         ← ảnh bố cục màn hình và bảng asset để đối chiếu
```

## Cách dùng với agent

Giải nén vào thư mục dự án, rồi đưa agent câu lệnh mở đầu như sau:

> Đọc `README.md`, `GDD.md` và `manifest.json`. Dựng game theo GDD bằng Phaser 3 + TypeScript + Vite. Nạp mọi asset qua `manifest.json`, không đổi tên file. Bố cục màn hình bám theo ảnh trong `reference/`. Làm lần lượt theo mục 12 của GDD; xong mỗi bước thì chạy thử và báo lại cho tôi trước khi sang bước tiếp theo.

Ghi chú:
- PNG có nền trong suốt. Nhân vật xuất ở @3x, phần lớn asset khác ở @2x, hình nền ở @3x. Trường `size` trong manifest là kích thước logic @1x.
- `anchor` (0–1) là điểm đặt sprite xuống đất, ví dụ chân của Lam.
- Icon trong `ui/` và `hud/` dùng `stroke="currentColor"` trong SVG; PNG đã được tô sẵn màu.
