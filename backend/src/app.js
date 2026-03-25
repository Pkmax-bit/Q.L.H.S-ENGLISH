const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const corsOptions = require('./config/cors');
const errorHandler = require('./middleware/errorHandler');

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

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Education Center API is running',
    data: {
      version: '1.0.0',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
  });
});

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

// Serve frontend static files in production
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
const fs = require('fs');
if (fs.existsSync(frontendDist)) {
  console.log(`[SPA] Serving frontend from: ${frontendDist}`);
  app.use(express.static(frontendDist));

  // SPA fallback: any non-API route → index.html
  app.get('{*path}', (req, res, next) => {
    if (req.url.startsWith('/api/')) {
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
