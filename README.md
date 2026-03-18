# 🏫 Education Center Management System

Hệ thống quản lý trung tâm đào tạo - Quản lý giáo viên, học sinh, lớp học, bài học, bài tập, thời khóa biểu, tài chính.

## Tech Stack

### Backend
| Công nghệ | Mô tả |
|-----------|-------|
| Node.js v22 | Runtime |
| Express.js | Framework (plain JavaScript) |
| Supabase | PostgreSQL + PostgREST |
| JWT + bcrypt | Authentication |
| Socket.IO | Realtime |
| Render | Deploy (free tier) |

### Frontend
| Công nghệ | Mô tả |
|-----------|-------|
| React 19 | Framework |
| Vite 6 | Build tool |
| Tailwind CSS v4 | Styling |
| Lucide React | Icons |
| SheetJS (xlsx) | Excel export |
| Axios | HTTP client |
| React Router v7 | Routing |
| Render | Deploy (static site) |

## Project Structure

```
education-center/
├── backend/                # Express API + Supabase
│   ├── src/
│   │   ├── config/         # Supabase client, JWT, CORS
│   │   ├── middleware/      # Auth, upload, error handling
│   │   ├── routes/          # 12 route files
│   │   ├── controllers/     # 12 controllers
│   │   ├── services/        # 12 services (Supabase queries)
│   │   ├── utils/           # Helpers
│   │   ├── socket/          # Socket.IO
│   │   └── migrations/      # SQL files for Supabase
│   ├── server.js
│   └── package.json
├── frontend/               # React SPA
│   ├── src/
│   │   ├── components/      # 50+ components
│   │   ├── pages/           # 13 pages
│   │   ├── services/        # API calls (Axios)
│   │   ├── hooks/           # Custom hooks
│   │   ├── context/         # Auth, Toast, Socket
│   │   └── utils/           # Helpers
│   └── package.json
├── render.yaml             # Render.com deploy config
└── package.json            # Root scripts
```

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/Pkmax-bit/Q.L.H.S-ENGLISH.git
cd Q.L.H.S-ENGLISH
npm run install:all
```

### 2. Setup Supabase Database

1. Vào [Supabase Dashboard](https://supabase.com/dashboard)
2. Tạo project hoặc chọn project có sẵn
3. Vào **SQL Editor**
4. Copy nội dung file `backend/src/migrations/_all_migrations.sql`
5. Paste vào SQL Editor → **Run**

### 3. Configure Environment

```bash
cd backend
cp .env.example .env
```

Sửa `.env`:
```
SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_KEY=[your-anon-key]
SUPABASE_SERVICE_KEY=[your-service-role-key]
```

Lấy keys từ: Supabase Dashboard → Settings → API

### 4. Seed Data

```bash
npm run seed
```

### 5. Start Development

```bash
npm run dev
# Backend: http://localhost:3001
# Frontend: http://localhost:5173
```

### 6. Login

```
Email:    admin@edu.com
Password: admin123
```

## Deploy to Render.com

### Bước 1: Setup Supabase Database
- Chạy migrations trong SQL Editor (file `_all_migrations.sql`)
- Chạy seed: `npm run seed`

### Bước 2: Deploy trên Render
1. Vào [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect GitHub → chọn repo
3. Nhập Environment Variables:

**Backend (education-center-api):**
| Key | Value |
|-----|-------|
| SUPABASE_URL | `https://[project].supabase.co` |
| SUPABASE_KEY | Anon key từ Supabase |
| SUPABASE_SERVICE_KEY | Service role key từ Supabase |
| CORS_ORIGIN | URL frontend (sau khi deploy) |

**Frontend (education-center-web):**
| Key | Value |
|-----|-------|
| VITE_API_URL | `https://[backend-url].onrender.com/api` |
| VITE_SOCKET_URL | `https://[backend-url].onrender.com` |

4. Click **Apply**

### Bước 3: Cập nhật URLs
Sau khi deploy xong, lấy URLs thật và cập nhật:
- Backend env: `CORS_ORIGIN` = URL frontend
- Frontend env: `VITE_API_URL` và `VITE_SOCKET_URL` = URL backend

## Features

| Module | Chức năng |
|--------|----------|
| 📊 Dashboard | Thống kê tổng quan |
| 👨‍🏫 Giáo viên | CRUD, phân lớp, lịch dạy |
| 👨‍🎓 Học sinh | CRUD, ghi danh lớp |
| 📚 Môn học | Quản lý mã & tên môn |
| 🏫 Lớp học | CRUD, quản lý HS/GV |
| 📖 Bài học | Văn bản, file, YouTube, Drive |
| 📝 Bài tập | Trắc nghiệm, tự luận, kết hợp |
| 📅 Thời khóa biểu | Lưới tuần, kiểm tra trùng lịch |
| 🏢 Cơ sở & Phòng | Quản lý phòng, thiết bị |
| 💰 Tài chính | Thu/chi, danh mục, báo cáo |

## License

MIT
