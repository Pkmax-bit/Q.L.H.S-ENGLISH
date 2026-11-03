const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

let io;

/**
 * Ai đang mở bảng nào: boardId -> (registrantId -> { name, isManager, sockets }).
 *
 * Đếm SỐ SOCKET chứ không đánh dấu có/không: một người hay mở hai tab, đóng
 * một tab mà xóa luôn khỏi danh sách thì tab còn lại thành "đã offline".
 *
 * Giữ trong bộ nhớ tiến trình. Chạy nhiều instance thì mỗi instance chỉ biết
 * người nối vào nó — lúc đó phải chuyển sang Redis adapter, nhưng hiện Render
 * chạy một instance nên chưa cần.
 */
const dangOnline = new Map();

/**
 * Hai mức chi tiết cho hai phòng:
 *   phòng quản lý — danh sách TÊN, vì trung tâm vốn đã thấy hết học viên
 *   phòng bảng    — chỉ "trung tâm có đang trực không" và đếm đầu người
 *
 * Trang này công khai, chỉ cần một số điện thoại là vào được, nên không thể
 * phát tên người này sang màn hình người kia.
 */
const phatOnline = (boardId) => {
  if (!io) return;
  const ai = [...(dangOnline.get(boardId)?.values() || [])];
  io.to(`booking_manager:${boardId}`).emit('booking:presence', {
    board_id: boardId,
    people: ai.map((x) => ({ id: x.id, name: x.name, is_manager: x.isManager })),
  });
  io.to(`booking_board:${boardId}`).emit('booking:presence', {
    board_id: boardId,
    center_online: ai.some((x) => x.isManager),
    count: ai.length,
  });
};

const vaoBang = (boardId, nguoi) => {
  if (!boardId || !nguoi) return;
  if (!dangOnline.has(boardId)) dangOnline.set(boardId, new Map());
  const phong = dangOnline.get(boardId);
  const cu = phong.get(nguoi.id);
  if (cu) cu.sockets += 1;
  else phong.set(nguoi.id, { ...nguoi, sockets: 1 });
  phatOnline(boardId);
};

const roiBang = (boardId, registrantId) => {
  const phong = dangOnline.get(boardId);
  const cu = phong?.get(registrantId);
  if (!cu) return;
  cu.sockets -= 1;
  if (cu.sockets <= 0) phong.delete(registrantId);
  if (phong.size === 0) dangOnline.delete(boardId);
  phatOnline(boardId);
};

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
    const rid = socket.registrant?.id;
    // Bảng mà socket này đang mở, để lúc ngắt còn biết phải gỡ khỏi đâu
    let bangDangMo = null;

    socket.on('booking:join_board', async (boardId) => {
      if (!boardId) return;
      socket.join(`booking_board:${boardId}`);
      if (!rid) return;
      bangDangMo = boardId;
      try {
        // eslint-disable-next-line global-require
        const { getRegistrantBrief } = require('../services/booking.service');
        // Tên lấy từ DB theo id trong token, không nhận tên do client gửi lên
        const me = await getRegistrantBrief(rid);
        vaoBang(boardId, { id: rid, name: me?.full_name || 'Khách', isManager: Boolean(me?.is_manager) });
      } catch {
        // Không tra được tên thì thôi không ghi vào danh sách đang online;
        // chat và lưới vẫn chạy bình thường
      }
    });
    socket.on('booking:leave_board', (boardId) => {
      if (!boardId) return;
      socket.leave(`booking_board:${boardId}`);
      if (rid && bangDangMo === boardId) {
        roiBang(boardId, rid);
        bangDangMo = null;
      }
    });

    if (rid) {
      socket.join(`booking_thread:${rid}`);
      socket.on('booking:join_manager', async (boardId) => {
        if (!boardId) return;
        try {
          // eslint-disable-next-line global-require
          const { isManagerSession } = require('../services/booking.service');
          if (await isManagerSession(rid)) {
            socket.join(`booking_manager:${boardId}`);
            // Vừa vào phòng quản lý thì chưa nhận được lần phát trước đó
            phatOnline(boardId);
          }
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
      if (rid && bangDangMo) roiBang(bangDangMo, rid);
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
