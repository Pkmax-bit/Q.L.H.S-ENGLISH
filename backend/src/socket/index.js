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
    // Hai loại phiên nối vào cùng một server socket:
    //   token        = tài khoản nội bộ (có mật khẩu)
    //   bookingToken = người đăng ký ở trang công khai, chỉ có số điện thoại
    // Hai secret khác nhau nên không thể lấy token bên này đi đóng vai bên kia.
    const { token, bookingToken } = socket.handshake.auth || {};

    if (bookingToken) {
      try {
        const decoded = jwt.verify(bookingToken, jwtConfig.booking.secret);
        if (decoded.kind !== 'booking' || !decoded.rid) return next(new Error('Invalid booking token'));
        socket.registrant = { id: decoded.rid, phone: decoded.phone || null };
        return next();
      } catch {
        return next(new Error('Invalid booking token'));
      }
    }

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

    // Phòng chat của trang đăng ký. Người đăng ký CHỈ vào được phòng luồng của
    // chính mình — id lấy từ token, không nhận từ client, nên không ai nghe lén
    // được luồng của người khác bằng cách gửi id khác lên.
    // Phòng BẢNG: ai đang mở bảng cũng vào được, kể cả tài khoản nội bộ. Sự
    // kiện trong phòng này chỉ là tín hiệu "có thay đổi", không kèm dữ liệu,
    // nên vào phòng không cho ai thấy thêm thứ gì họ chưa được xem.
    socket.on('booking:join_board', (boardId) => {
      if (boardId) socket.join(`booking_board:${boardId}`);
    });
    socket.on('booking:leave_board', (boardId) => {
      if (boardId) socket.leave(`booking_board:${boardId}`);
    });

    const rid = socket.registrant?.id;
    if (rid) {
      socket.join(`booking_thread:${rid}`);
      socket.on('booking:join_manager', async (boardId) => {
        if (!boardId) return;
        try {
          // eslint-disable-next-line global-require
          const { isManagerSession } = require('../services/booking.service');
          if (await isManagerSession(rid)) socket.join(`booking_manager:${boardId}`);
        } catch {
          // Không vào được phòng quản lý thì chat vẫn chạy, chỉ là phải chờ lần hỏi sau
        }
      });
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
