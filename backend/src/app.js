const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const corsOptions = require('./config/cors');
const errorHandler = require('./middleware/errorHandler');
const { supabase } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth.routes');
const teachersRoutes = require('./routes/teachers.routes');
const studentsRoutes = require('./routes/students.routes');
const subjectsRoutes = require('./routes/subjects.routes');
const classesRoutes = require('./routes/classes.routes');
const lessonsRoutes = require('./routes/lessons.routes');
const assignmentsRoutes = require('./routes/assignments.routes');
const schedulesRoutes = require('./routes/schedules.routes');
const facilitiesRoutes = require('./routes/facilities.routes');
const roomsRoutes = require('./routes/rooms.routes');
const financesRoutes = require('./routes/finances.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const templatesRoutes = require('./routes/templates.routes');
const enrollmentRequestsRoutes = require('./routes/enrollmentRequests.routes');
const submissionsRoutes = require('./routes/submissions.routes');
const uploadsRoutes = require('./routes/uploads.routes');
const questionBankRoutes = require('./routes/questionBank.routes');
const driveRoutes = require('./routes/drive.routes');
const tuitionRoutes = require('./routes/tuition.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const teacherPayrollRoutes = require('./routes/teacherPayroll.routes');
const lessonBundlesRoutes = require('./routes/lessonBundles.routes');
const messengerRoutes = require('./routes/messenger.routes');
const socialRoutes = require('./routes/social.routes');
const shopRoutes = require('./routes/shop.routes');

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging — combined in production, compact in development
if (process.env.NODE_ENV !== 'test') {
  const format = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
  app.use(morgan(format));
}

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')));

// Health check (deep: DB ping)
app.get('/api/health', async (req, res) => {
  let database = 'ok';
  let dbError = null;
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) {
      database = 'error';
      dbError = error.message;
    }
  } catch (err) {
    database = 'error';
    dbError = err.message;
  }

  const healthy = database === 'ok';
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    message: healthy ? 'Education Center API is running' : 'API degraded — database unreachable',
    data: {
      version: '1.0.0',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      database,
      ...(dbError && process.env.NODE_ENV !== 'production' ? { dbError } : {}),
    },
  });
});

// Rate limit auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many auth attempts. Please try again later.',
    data: null,
  },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/refresh', authLimiter);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/lessons', lessonsRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/facilities', facilitiesRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/finances', financesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/enrollment-requests', enrollmentRequestsRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/question-bank', questionBankRoutes);
app.use('/api/drive-proxy', driveRoutes);
app.use('/api/tuition', tuitionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/teacher-payroll', teacherPayrollRoutes);
app.use('/api/lesson-bundles', lessonBundlesRoutes);
app.use('/api/messenger', messengerRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/shop', shopRoutes);

// Serve frontend static files in production
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  console.log(`[SPA] Serving frontend from: ${frontendDist}`);
  app.use(express.static(frontendDist));

  // SPA fallback: any non-API route → index.html
  app.get('{*path}', (req, res, next) => {
    if (req.url.startsWith('/api/') || req.url.startsWith('/uploads/') || req.url.startsWith('/socket.io')) {
      return next();
    }
    const indexPath = path.join(frontendDist, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) next();
    });
  });
} else {
  console.log(`[SPA] Frontend dist not found at: ${frontendDist} — skipping static serve`);
}

// 404 handler (only for /api/* routes or when frontend not available)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
    data: null,
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
