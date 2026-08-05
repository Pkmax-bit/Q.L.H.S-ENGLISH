/**
 * Validate required environment variables at startup.
 * Call before loading JWT config or starting the HTTP server.
 */
function requireEnv(name, { minLength } = {}) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    console.error(`[config] Missing required env: ${name}`);
    process.exit(1);
  }
  if (minLength && String(value).length < minLength) {
    console.error(`[config] ${name} must be at least ${minLength} characters`);
    process.exit(1);
  }
  return value;
}

function validateEnv() {
  requireEnv('SUPABASE_URL');
  if (!process.env.SUPABASE_SERVICE_KEY && !process.env.SUPABASE_KEY) {
    console.error('[config] Missing SUPABASE_SERVICE_KEY or SUPABASE_KEY');
    process.exit(1);
  }

  requireEnv('JWT_ACCESS_SECRET', { minLength: 32 });
  requireEnv('JWT_REFRESH_SECRET', { minLength: 32 });

  const cors = process.env.CORS_ORIGIN || '';
  if (process.env.NODE_ENV === 'production') {
    if (!cors.trim()) {
      console.error('[config] CORS_ORIGIN is required in production');
      process.exit(1);
    }
    if (cors.split(',').map((o) => o.trim()).includes('*')) {
      console.error('[config] CORS_ORIGIN must not be "*" in production');
      process.exit(1);
    }
  }
}

module.exports = { validateEnv, requireEnv };
