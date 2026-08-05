# Deploy production checklist

Thực hiện theo thứ tự. Chi tiết env: [README.md](../README.md).

## 1. Supabase production

1. Tạo project Supabase **mới** (không dùng DB demo).
2. Lấy `SUPABASE_URL`, anon key (`SUPABASE_KEY`), service role (`SUPABASE_SERVICE_KEY`).
3. Connection string → `DATABASE_URL` (Settings → Database).
4. Apply schema:

```bash
cd backend
# .env trỏ tới project production
npm run migrate:fresh   # nếu DB trống và dùng 000_base_schema
# hoặc
npm run migrate:all     # incremental 000_extensions … 029_*
npm run migrate:status
```

5. Storage → tạo bucket **`question-bank`** (public nếu dùng public URL).
6. Seed admin:

```bash
ADMIN_EMAIL=admin@yourschool.com ADMIN_PASSWORD='at-least-12-chars' npm run seed:admin
```

7. Bật backup / PITR theo plan.

## 2. Render

1. Connect GitHub repo, dùng [render.yaml](../render.yaml) (một service `education-center-api`).
2. Set env (Dashboard):

| Key | Giá trị |
|-----|---------|
| `SUPABASE_URL` | từ Supabase |
| `SUPABASE_KEY` | anon key |
| `SUPABASE_SERVICE_KEY` | service role |
| `CORS_ORIGIN` | `https://<service>.onrender.com` |
| `VITE_API_URL` | `https://<service>.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://<service>.onrender.com` |
| `JWT_*` | generateValue hoặc secret ≥ 32 chars |
| `NODE_ENV` | `production` |

3. **Lưu ý:** `VITE_*` phải có **trước** build. Nếu đổi URL sau deploy đầu, Clear build cache + Redeploy.
4. Deploy `main` (CI xanh trước khi merge).
5. Verify: `curl https://<service>.onrender.com/api/health`

## 3. Smoke 30 phút

Theo [QA_CHECKLIST.md](QA_CHECKLIST.md) mục Infra +: lớp → lịch → điểm danh → học phí → chat → 1 post social.

## 4. Handoff

- Gửi URL + tài khoản admin cho chủ trường.
- Bookmark Render logs + Supabase logs.
- Đọc [OPS.md](OPS.md) cho tuần đầu.
