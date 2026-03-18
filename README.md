# 🏫 Education Center Management System

Hệ thống quản lý trung tâm đào tạo - Quản lý giáo viên, học sinh, lớp học, bài học, bài tập, thời khóa biểu, tài chính.

## Tech Stack

### Backend
- **Node.js** (≥18) - Runtime
- **Express 5** - Web framework
- **PostgreSQL** - Database (via Supabase)
- **JWT** - Authentication
- **Socket.IO** - Realtime

### Frontend
- **React 19** - UI library
- **Vite 6** - Build tool
- **Tailwind CSS 4** - Styling
- **React Router DOM 7** - Routing

### Database
- **PostgreSQL** - Primary database (via Supabase)
- **pg (node-postgres)** - Database driver

## Project Structure

```
education-center/
├── backend/                # Express API
│   ├── src/
│   │   ├── config/         # Database, JWT, CORS config
│   │   ├── middleware/      # Auth, upload, error handling
│   │   ├── routes/          # API routes
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Helpers
│   │   ├── socket/          # Socket.IO
│   │   ├── migrations/      # SQL migrations + runner
│   │   └── app.js
│   ├── server.js
│   └── package.json
├── frontend/               # React SPA
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API calls
│   │   ├── hooks/           # Custom hooks
│   │   ├── context/         # React context
│   │   └── utils/           # Helpers
│   └── package.json
├── render.yaml             # Render.com deploy config
├── package.json            # Root scripts
└── README.md
```

## Prerequisites

- Node.js 18+
- npm
- Git
- Supabase account (for PostgreSQL database)

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/Pkmax-bit/Q.L.H.S-ENGLISH.git
cd Q.L.H.S-ENGLISH

# Install all dependencies
npm run install:all
```

### 2. Configure Environment

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your Supabase DATABASE_URL
```

**Lấy DATABASE_URL từ Supabase:**
1. Vào [Supabase Dashboard](https://supabase.com/dashboard)
2. Chọn project → **Settings** → **Database**
3. Copy **Connection string** (URI format)
4. Paste vào `DATABASE_URL` trong `.env`

```bash
# Frontend
cd ../frontend
cp .env.example .env
# Default OK for local dev
```

### 3. Run Migrations & Seed

```bash
npm run migrate
npm run seed
```

### 4. Start Development

```bash
# Run both backend + frontend
npm run dev

# Or separately:
npm run dev:backend    # Backend: http://localhost:3001
npm run dev:frontend   # Frontend: http://localhost:5173
```

### 5. Login

```
Email:    admin@edu.com
Password: admin123
```

## Features

| Module | Description |
|--------|------------|
| 👨‍🏫 Giáo viên | CRUD, phân lớp, xem TKB |
| 👨‍🎓 Học sinh | CRUD, ghi danh lớp |
| 📚 Môn học | Quản lý mã & tên môn |
| 🏫 Lớp học | CRUD, quản lý HS/GV trong lớp |
| 📖 Bài học | Văn bản, file, YouTube, Drive |
| 📝 Bài tập | Trắc nghiệm, tự luận, kết hợp |
| 📅 Thời khóa biểu | Lưới tuần, kiểm tra trùng lịch |
| 🏢 Cơ sở & Phòng | Quản lý phòng học, thiết bị |
| 💰 Tài chính | Thu/chi, danh mục, báo cáo |
| 📊 Dashboard | Thống kê tổng quan |

## Deploy to Render.com

### Option 1: Blueprint (Recommended)

1. Fork repo trên GitHub
2. Vào [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
3. Kết nối GitHub → chọn repo
4. Render đọc `render.yaml` tự động
5. **Nhập Environment Variables** khi được hỏi:
   - `DATABASE_URL` = Supabase connection string
   - `CORS_ORIGIN` = URL frontend (sau khi deploy)
   - `VITE_API_URL` = URL backend + `/api`
   - `VITE_SOCKET_URL` = URL backend
6. Click **Apply**

### Option 2: Manual

**Backend:**
1. New → Web Service → Connect repo
2. Build: `cd backend && npm install && node src/migrations/run.js && node src/migrations/seed.js`
3. Start: `cd backend && node server.js`
4. Add env vars

**Frontend:**
1. New → Static Site → Connect repo
2. Build: `cd frontend && npm install --include=dev && npm run build`
3. Publish: `frontend/dist`
4. Add rewrite rule: `/*` → `/index.html`
5. Add env vars

## API Documentation

Base URL: `http://localhost:3001/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/login | Đăng nhập |
| POST | /auth/register | Đăng ký (admin) |
| GET | /teachers | DS Giáo viên |
| GET | /students | DS Học sinh |
| GET | /subjects | DS Môn học |
| GET | /classes | DS Lớp học |
| GET | /lessons | DS Bài học |
| GET | /assignments | DS Bài tập |
| GET | /schedules | Thời khóa biểu |
| GET | /facilities | Cơ sở |
| GET | /rooms | Phòng học |
| GET | /finances | Tài chính |
| GET | /dashboard/stats | Thống kê |

## License

MIT
