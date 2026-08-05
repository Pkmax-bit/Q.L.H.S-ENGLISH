const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((o) => o.trim()),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    try {
      const decoded = jwt.verify(token, jwtConfig.access.secret);
      socket.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        fullName: decoded.fullName,
      };
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user?.id;
    console.log(`Socket connected: ${socket.id} | User: ${socket.user?.fullName || userId}`);

    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.on('join:messenger_group', (id) => {
      if (id) socket.join(`messenger_group:${id}`);
    });

    socket.on('leave:messenger_group', (id) => {
      if (id) socket.leave(`messenger_group:${id}`);
    });

    socket.on('messenger_group:typing', ({ group_id, is_typing } = {}) => {
      if (!group_id || !userId) return;
      socket.to(`messenger_group:${group_id}`).emit('messenger_group:typing', {
        group_id,
        user_id: userId,
        full_name: socket.user?.fullName || null,
        is_typing: !!is_typing,
        ts: Date.now(),
      });
    });

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.IO has not been initialized');
  return io;
};

const emitNotification = (event, data, room = null) => {
  try {
    const socketIO = getIO();
    if (room) socketIO.to(room).emit(event, data);
    else socketIO.emit(event, data);
  } catch {
    console.warn('Socket.IO not initialized, skipping notification');
  }
};

module.exports = { initSocket, getIO, emitNotification };
