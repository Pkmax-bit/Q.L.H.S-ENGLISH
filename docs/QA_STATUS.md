# QA status — automated + static review

Ngày: 2026-08-05  
Môi trường code: local / CI  
DB: Supabase QLHS (schema Full đã có, `schema_migrations` đã seed)

## Automated

- [x] Backend unit/smoke tests (`npm test`) — 9/9 pass
- [x] Backend syntax check (`npm run check`)
- [x] Frontend production build (`npm run build`)
- [x] GitHub Actions workflow thêm (`.github/workflows/ci.yml`)
- [x] Health endpoint deep DB check
- [x] JWT fail-fast + CORS production guard
- [x] Auth rate limit
- [x] Error Boundary FE

## Static review (P0 hunt)

| Khu vực | Kết quả |
|---------|---------|
| Routes Full features (social, messenger, attendance, payroll) | Đã mount trong `app.js` + AppRouter + Sidebar |
| Schema social/messenger/attendance/payroll | Có trên Supabase QLHS |
| Bucket question-bank | Đã tạo + policy đọc public |
| Profiles trống | **Phải** chạy `seed:admin` trước go-live (không seed mật khẩu demo lên prod) |
| Upload social/messenger local disk | Documented — ephemeral trên Render free (P1 ops) |

## P0 hiện tại

Không phát hiện P0 chặn release trong code/review lần này.

**Ghi chú bảo mật DB:** Nhiều bảng bật RLS nhưng không có policy — với kiến trúc Express + `SUPABASE_SERVICE_KEY` đây là **cố ý** (anon PostgREST bị chặn). Đã revoke `EXECUTE` trên `rls_auto_enable()` và set `search_path` cho các function tuition.

## Việc còn lại thủ công (người vận hành)

Làm theo [QA_CHECKLIST.md](QA_CHECKLIST.md) trên staging/prod sau khi Render có URL:

1. `seed:admin` với mật khẩu mạnh  
2. Tick checklist Core + Full theo 3 role  
3. Connect repo → Blueprint Render ([DEPLOY.md](DEPLOY.md)) + set env  
4. Smoke 30 phút sau deploy  
5. Theo dõi tuần đầu theo [OPS.md](OPS.md)