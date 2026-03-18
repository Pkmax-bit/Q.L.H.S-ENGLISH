module.exports = {
  access: {
    secret: process.env.JWT_ACCESS_SECRET || 'default-access-secret',
    expiresIn: '15m',
  },
  refresh: {
    secret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    expiresIn: '7d',
    expiresInMs: 7 * 24 * 60 * 60 * 1000,
  },
};
