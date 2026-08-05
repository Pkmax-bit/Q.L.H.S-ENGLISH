# Harvest Shot — Web game (Three.js)

Học tiếng Anh bằng FPS farm: bắn đáp án → coins → trồng cây → mùa vụ → boss mở VIP.

**Engine:** trình duyệt + Three.js `0.160.0` · **Platform:** web only

## Chơi nhanh

Mở `index.html` (hoặc `prototype.html`) trong trình duyệt.

Offline dùng `vendor/three.min.js`. Nếu thiếu:

```powershell
powershell -ExecutionPolicy Bypass -File .\download-vendor.ps1
```

## Điều khiển

| Desktop | Mobile |
|---------|--------|
| Chuột nhìn (pointer lock) | Kéo màn hình |
| WASD | Stick trái |
| LMB bắn | Nút **Bắn** |
| E trồng · F tưới | **Trồng** · **Tưới** |
| L / B / M · nút Tiến độ | HUD |

## Nội dung

- **7 màn điền từ** + **7 màn từ vựng**
- **3 boss** (mở lần lượt: ≥6 màn thường → Word Worm → Grammar Golem → Lexicon Dragon)
- Màn **Tiến độ**: % hoàn thành, streak tốt nhất, daily, VIP đã mở

## Deploy

### GitHub Pages

1. Push thư mục này lên repo (hoặc subfolder).
2. Settings → Pages → Deploy from branch → chọn thư mục chứa `index.html`.
3. File `.nojekyll` đã có (không cần Jekyll).

Nếu game nằm trong `docs/` hoặc `/` của repo: URL sẽ là `https://<user>.github.io/<repo>/`.

### Vercel

Trong thư mục game:

```bash
npx vercel
```

Hoặc trên [vercel.com](https://vercel.com): Import repo, **Root Directory** = `prototypes/harvest-shot-concept`, Framework = Other.

`vercel.json` đã cấu hình cache cho `vendor/`.

### Netlify / bất kỳ static host

Upload cả folder (gồm `index.html`, `js/`, `vendor/`). Không cần build step.

## Cấu trúc

```
index.html              # Entry production
prototype.html          # Redirect → index.html (tương thích cũ)
vercel.json             # Deploy Vercel
.nojekyll               # GitHub Pages
download-vendor.ps1
vendor/three.min.js
js/content.js           # 7 fill + 7 vocab + 3 bosses + crops
js/game.js              # Loop + touch + save + progress
js/audio.js | plants.js | world.js
```

## Assets 3D

Nông trại dùng model **Kenney Nature Kit** (CC0) trong `assets/models/` — cây, đá, hàng rào, hoa, lúa, v.v.
Critters: Fox (Khronos Sample) + Parrot (three.js examples).

Xem `assets/models/LICENSE-Kenney.txt`.

## Phase

- [x] Phase 1 — Offline, touch, UI, save
- [x] Phase 2 — Progress, thêm màn, deploy config
