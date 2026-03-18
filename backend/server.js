require('dotenv').config();

const http = require('http');
const app = require('./src/app');
const { initSocket } = require('./src/socket');

const PORT = process.env.PORT || 3001;

const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
server.listen(PORT, () => {
  console.log(`Education Center API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = server;
