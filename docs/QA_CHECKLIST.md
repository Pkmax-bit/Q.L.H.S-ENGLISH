# QA Checklist — Full features (staging / production smoke)

Tick mỗi mục trên **staging** trước go-live. P0 = chặn release.

## Roles

- [ ] Admin
- [ ] Teacher
- [ ] Student

---

## Core

### Auth
- [ ] Login / logout
- [ ] Refresh token (để session lâu, reload không mất login)
- [ ] Đổi mật khẩu
- [ ] Sidebar / menu đúng theo role
- [ ] User không active bị từ chối login

### Teachers / Students / Classes
- [ ] CRUD giáo viên, học viên
- [ ] Tạo lớp, gán GV, ghi danh HV
- [ ] Enrollment request (nếu dùng)

### Schedules & lessons
- [ ] Tạo lịch / xem lịch (calendar hoặc kanban)
- [ ] Sessions theo lớp
- [ ] Lessons CRUD, gán vào lớp
- [ ] Assignments + nộp bài (student)
- [ ] Chấm bài (teacher) — nếu dùng
- [ ] TOEIC import (nếu dùng) — P1 nếu không critical

### Tuition & finances
- [ ] Cấu hình học phí lớp
- [ ] Generate invoices
- [ ] Record payment
- [ ] Receivables / ledger học viên
- [ ] Finance summary hiện số liệu

---

## Full modules

### Attendance
- [ ] Mở session điểm danh
- [ ] Đánh dấu present / absent / late
- [ ] Xem lại lịch sử theo lớp

### Teacher payroll
- [ ] Generate payroll entries
- [ ] Đánh dấu đã trả
- [ ] Hiện trên finance overview

### Messenger
- [ ] DM 1-1
- [ ] Class group chat (ensureClassChat)
- [ ] Gửi tin nhắn realtime (socket)
- [ ] Đính kèm file nhỏ

### Social
- [ ] Feed load
- [ ] Tạo post (text + ảnh)
- [ ] Like / comment
- [ ] Xem profile social

---

## Infra smoke (go-live)

- [ ] `GET /api/health` → 200, `database: "ok"`
- [ ] SPA load từ cùng origin API
- [ ] CORS không báo lỗi console
- [ ] Upload question-bank (nếu dùng) với bucket `question-bank`

## Kết quả

| Mức | Số bug | Ghi chú |
|-----|--------|---------|
| P0  |        | Phải = 0 trước Phase 5 |
| P1  |        | Fix sau go-live ok |

Ngày QA: __________  
Người QA: __________  
Môi trường: staging / production  
