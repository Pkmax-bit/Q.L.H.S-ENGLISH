# Q.L.H.S-ENGLISH — Education Center Management

Hệ thống quản lý trung tâm tiếng Anh: lớp học, lịch, bài tập, học phí, điểm danh, lương GV, messenger, mạng xã hội nội bộ.

## Stack

- **Frontend:** React 19 + Vite 6 + Tailwind CSS 4
- **Backend:** Node.js + Express 5 + Socket.IO
- **Database:** Supabase (Postgres)
- **Deploy:** Render (một web service: API + static `frontend/dist`)

## Yêu cầu

- Node.js >= 18
- Tài khoản Supabase (project riêng cho production)

## Setup local

```bash
# 1. Cài dependency
npm run install:all

# 2. Copy env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Điền SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_KEY, JWT_* 

# 3. Migration (cần DATABASE_URL hoặc SUPABASE_ACCESS_TOKEN)
cd backend && npm run migrate:all

# 4. Seed tài khoản demo (chỉ môi trường dev)
cd backend && npm run seed

# 5. Chạy
npm run dev
```

- Frontend: http://localhost:5173  
- API: http://localhost:3001/api/health  

## Biến môi trường production

### Backend (`backend/.env` / Render Dashboard)

| Biến | Bắt buộc | Mô tả |
|------|----------|--------|
| `NODE_ENV` | có | `production` |
| `PORT` | không | Mặc định 3001 (Render gán PORT) |
| `SUPABASE_URL` | có | URL project Supabase |
| `SUPABASE_KEY` | có | Anon/publishable key |
| `SUPABASE_SERVICE_KEY` | có | Service role key (server-side) |
| `JWT_ACCESS_SECRET` | có | ≥ 32 ký tự (không có fallback mặc định) |
| `JWT_REFRESH_SECRET` | có | ≥ 32 ký tự |
| `BCRYPT_SALT_ROUNDS` | không | Mặc định 12 |
| `CORS_ORIGIN` | có | URL frontend (ví dụ `https://education-center-api.onrender.com`). **Không dùng `*`** |
| `UPLOAD_DIR` | không | Mặc định `uploads` |
| `QUESTION_BANK_BUCKET` | không | Bucket Storage, mặc định `question-bank` |
| `DATABASE_URL` | migrate | Connection string Postgres (chỉ khi chạy migration từ máy) |

### Frontend (build-time trên Render)

Khi API serve luôn SPA, set trong build của **cùng** service:

| Biến | Ví dụ |
|------|--------|
| `VITE_API_URL` | `https://education-center-api.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://education-center-api.onrender.com` |

## Migration

Chỉ giữ file `NNN_*.sql` (000–028). Runner ghi vào bảng `schema_migrations`.

```bash
cd backend
# DB trống — schema đầy đủ trong 000_base_schema.sql
npm run migrate:fresh

# Hoặc áp toàn bộ migration incremental (sau 000_extensions)
npm run migrate:all

# Một file
npm run migrate:apply -- 025_social_network.sql

# Xem version đã apply
npm run migrate:status
```

## Seed production (admin only)

```bash
cd backend
# Bắt buộc set ADMIN_EMAIL + ADMIN_PASSWORD (≥ 12 ký tự)
ADMIN_EMAIL=admin@yourschool.com ADMIN_PASSWORD='your-strong-password' npm run seed:admin
```

Không chạy `npm run seed` (demo accounts) trên production.

## Storage buckets (Supabase Dashboard → Storage)

1. **`question-bank`** — public hoặc signed URL; dùng cho ngân hàng câu hỏi  
2. Upload social/messenger hiện lưu local disk (`uploads/`) — trên Render filesystem **éphémère**; nâng Persistent Disk hoặc chuyển sang Supabase Storage nếu cần giữ file lâu dài.

## Deploy Render

Blueprint: [render.yaml](render.yaml) — **một** web service `education-center-api` (build FE → chạy BE, serve `frontend/dist`).

1. Tạo Supabase **production** riêng, apply migrations, tạo bucket, seed admin.
2. Trên Render: New → Blueprint → chọn repo, hoặc tạo Web Service với lệnh trong `render.yaml`.
3. Điền env sync:false: `SUPABASE_*`, `CORS_ORIGIN`, `VITE_API_URL`, `VITE_SOCKET_URL`.
4. Deploy → kiểm tra `GET /api/health` (phải có `"database":"ok"`).
5. Đăng nhập admin → smoke Full features (xem [docs/QA_CHECKLIST.md](docs/QA_CHECKLIST.md)).

### Runbook nhanh

| Tình huống | Cách xử lý |
|------------|------------|
| Deploy lỗi | Render → Rollback previous deploy |
| Health `database: error` | Kiểm tra SUPABASE_* / network; xem Supabase logs |
| Quên mật khẩu admin | Chạy lại `seed:admin` với cùng email (cập nhật hash) hoặc SQL update `password_hash` |
| Migration lệch | `npm run migrate:status` rồi `migrate:apply` file còn thiếu |
| CORS lỗi | `CORS_ORIGIN` phải đúng origin trình duyệt (không có trailing slash lệch) |

Chi tiết vận hành sau go-live: [docs/OPS.md](docs/OPS.md).

## Scripts hữu ích

| Script | Mô tả |
|--------|--------|
| `npm run dev` | FE + BE concurrent |
| `npm run build` | Build frontend |
| `cd backend && npm test` | Smoke/unit tests |
| `cd frontend && npm run build` | Production build FE |

## Tài liệu thêm

- [docs/DEPLOY.md](docs/DEPLOY.md) — Checklist deploy production  
- [docs/QA_CHECKLIST.md](docs/QA_CHECKLIST.md) — QA Full features theo role  
- [docs/QA_STATUS.md](docs/QA_STATUS.md) — Kết quả review/smoke tự động  
- [docs/OPS.md](docs/OPS.md) — Monitoring, backup, hotfix