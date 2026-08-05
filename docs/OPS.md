# Operations runbook (sau go-live)

## Monitoring tối thiểu (Tuần 1+)

1. **Render Dashboard** → service `education-center-api`
   - CPU / Memory / Response time
   - Deploy history & failed deploys
   - Logs (filter 5xx, CORS, JWT)

2. **Supabase Dashboard**
   - Database → health / connections
   - Logs → API / Postgres
   - Advisors (security / performance)

3. **Health probe**
   - URL: `https://<your-service>.onrender.com/api/health`
   - Kỳ vọng: HTTP 200, `"database":"ok"`
   - 503 = DB unreachable → kiểm tra SUPABASE_* ngay

## Hotfix / rollback

```text
Render → Deploys → Rollback to previous successful deploy
```

Hoặc revert commit trên `main` và để autoDeploy chạy lại (CI phải xanh).

## Backup & restore drill

1. Supabase → Database → Backups (bật PITR nếu plan hỗ trợ; nếu không, export định kỳ).
2. Drill một lần / quý:
   - Tạo branch/clone DB hoặc restore vào project staging
   - Verify `migrate:status` + login admin
3. Ghi lại thời gian RTO thực tế vào đây: ______

## Rate limit & abuse

- Auth: 30 req / 15 phút / IP trên `/api/auth/login` và `/refresh`
- Nếu bị spam API khác: thêm limiter chung trên `/api` trong `app.js`

## Logger nâng cao (tuần sau go-live)

Hiện dùng `morgan('combined')` trong production. Khi cần:

- Thêm Pino + request-id middleware
- Ship logs tới dịch vụ tập trung (nếu có)

## Feature flags (khẩn cấp)

Nếu module mới (social/messenger) gây sự cố nặng:

1. Hotfix tắt route trong `app.js` (comment `app.use('/api/social'...)`) và redeploy
2. Hoặc ẩn menu FE trong Sidebar — nhanh hơn cho UX, API vẫn còn

Mặc định production: **Full features bật**.

## Checklist tuần đầu

- [ ] Ngày 1–2: theo dõi logs mỗi buổi
- [ ] Không còn P0 mới
- [ ] Backup/snapshot xác nhận tồn tại
- [ ] Ít nhất 1 admin + 1 GV + 1 HV thật dùng ổn
