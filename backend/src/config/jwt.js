module.exports = {
  access: {
    secret: process.env.JWT_ACCESS_SECRET || 'default-access-secret',
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '24h',
  },
  refresh: {
    secret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    expiresIn: '30d',
    expiresInMs: 30 * 24 * 60 * 60 * 1000,
  },
};
