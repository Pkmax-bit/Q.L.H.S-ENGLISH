const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    // Allow non-browser clients (no Origin) e.g. health checks, curl
    if (!origin) {
      return callback(null, true);
    }

    // Wildcard only allowed outside production (validateEnv blocks * in production)
    if (allowedOrigins.includes('*') && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  // X-Booking-Token: phiên của người đăng ký lịch học ở trang công khai /dk/<slug>.
  // Thiếu header này trong whitelist thì trình duyệt chặn ngay ở bước preflight.
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Booking-Token'],
};

module.exports = corsOptions;
