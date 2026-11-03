import axios from 'axios'
import api from './api'

const BOOKING_TOKEN_KEY = 'bookingToken'
const BOOKING_REGISTRANT_KEY = 'bookingRegistrant'

/**
 * Instance RIÊNG cho nhánh công khai.
 *
 * Không dùng `api` vì interceptor của nó gắn accessToken của tài khoản nội bộ
 * và tự gọi /auth/refresh khi gặp 401 — đang đăng nhập admin mà mở thử link
 * đăng ký sẽ bị đá về /login.
 */
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
})

publicApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(BOOKING_TOKEN_KEY)
  if (token) config.headers['X-Booking-Token'] = token
  return config
})

export const bookingSession = {
  getToken: () => localStorage.getItem(BOOKING_TOKEN_KEY),
  getRegistrant: () => {
    try {
      return JSON.parse(localStorage.getItem(BOOKING_REGISTRANT_KEY) || 'null')
    } catch {
      return null
    }
  },
  save: ({ booking_token, registrant }) => {
    if (booking_token) localStorage.setItem(BOOKING_TOKEN_KEY, booking_token)
    if (registrant) localStorage.setItem(BOOKING_REGISTRANT_KEY, JSON.stringify(registrant))
  },
  clear: () => {
    localStorage.removeItem(BOOKING_TOKEN_KEY)
    localStorage.removeItem(BOOKING_REGISTRANT_KEY)
  },
}

const bookingService = {
  // ---- công khai (chỉ cần số điện thoại) ----
  identify: (data) => publicApi.post('/booking/public/identify', data),
  getBoard: (slug, week) => publicApi.get(`/booking/public/boards/${slug}`, { params: week ? { week } : undefined }),
  getMe: () => publicApi.get('/booking/public/me'),
  registerSlot: (slotId, sessionDate) =>
    publicApi.post(`/booking/public/slots/${slotId}/register`, { session_date: sessionDate }),
  cancelMyEntry: (entryId) => publicApi.delete(`/booking/public/entries/${entryId}`),
  createRequests: (slug, cells) => publicApi.post(`/booking/public/boards/${slug}/requests`, { cells }),
  cancelMyRequest: (requestId) => publicApi.delete(`/booking/public/requests/${requestId}`),
  updateMyRequest: (requestId, patch) =>
    publicApi.patch(`/booking/public/requests/${requestId}`, patch),
  // Chỉ số được đánh dấu quản lý gọi được; server kiểm cờ, không phải ẩn nút
  listBoardStudents: (slug) => publicApi.get(`/booking/public/boards/${slug}/students`),
  managerSetRegistrantColor: (registrantId, color) =>
    publicApi.patch(`/booking/public/registrants/${registrantId}/color`, { color }),
  managerSetRegistrantPrice: (registrantId, pricePerSession) =>
    publicApi.patch(`/booking/public/registrants/${registrantId}/price`, {
      price_per_session: pricePerSession,
    }),
  listBoardActivity: (slug) => publicApi.get(`/booking/public/boards/${slug}/activity`),
  listBoardMessages: (slug, registrantId) =>
    publicApi.get(`/booking/public/boards/${slug}/messages`, {
      params: registrantId ? { registrant_id: registrantId } : undefined,
    }),
  sendBoardMessage: (slug, body, registrantId, replyTo, image) => {
    // Có ảnh thì phải gửi dạng multipart; axios tự đặt boundary nên KHÔNG
    // được tự tay set Content-Type, đặt tay là thiếu boundary và server
    // không tách nổi phần file
    if (image) {
      const form = new FormData()
      if (body) form.append('body', body)
      if (registrantId) form.append('registrant_id', registrantId)
      if (replyTo) form.append('reply_to', replyTo)
      form.append('image', image)
      return publicApi.post(`/booking/public/boards/${slug}/messages`, form, {
        headers: { 'Content-Type': undefined },
      })
    }
    return publicApi.post(`/booking/public/boards/${slug}/messages`, {
      body,
      registrant_id: registrantId,
      reply_to: replyTo || null,
    })
  },
  reactToBoardMessage: (messageId, emoji) =>
    publicApi.post(`/booking/public/messages/${messageId}/reactions`, { emoji }),
  listBoardThreads: (slug) => publicApi.get(`/booking/public/boards/${slug}/threads`),
  managerListPool: (slug) => publicApi.get(`/booking/public/boards/${slug}/pool`),
  managerDetachRequest: (requestId) => publicApi.post(`/booking/public/requests/${requestId}/detach`),
  managerRemoveFromPool: (itemId) => publicApi.delete(`/booking/public/pool/${itemId}`),
  managerScheduleFromPool: (itemId, data) =>
    publicApi.post(`/booking/public/pool/${itemId}/schedule`, data),

  // ---- quản trị (admin / giáo viên) ----
  listBoards: (params) => api.get('/booking/boards', { params }),
  getBoardDetail: (id, week) => api.get(`/booking/boards/${id}`, { params: week ? { week } : undefined }),
  createBoard: (data) => api.post('/booking/boards', data),
  updateBoard: (id, data) => api.put(`/booking/boards/${id}`, data),
  deleteBoard: (id) => api.delete(`/booking/boards/${id}`),
  cloneBoard: (id, data) => api.post(`/booking/boards/${id}/clone`, data),

  createSlot: (boardId, data) => api.post(`/booking/boards/${boardId}/slots`, data),
  createSlotsBulk: (boardId, data) => api.post(`/booking/boards/${boardId}/slots/bulk`, data),
  updateSlot: (slotId, data) => api.put(`/booking/slots/${slotId}`, data),
  deleteSlot: (slotId) => api.delete(`/booking/slots/${slotId}`),

  listRegistrations: (boardId, params) => api.get(`/booking/boards/${boardId}/registrations`, { params }),
  exportRegistrations: (boardId, params) =>
    api.get(`/booking/boards/${boardId}/registrations.csv`, { params, responseType: 'blob' }),
  listRequests: (boardId, params) => api.get(`/booking/boards/${boardId}/requests`, { params }),
  listActivity: (boardId, params) => api.get(`/booking/boards/${boardId}/activity`, { params }),
  reviewRequests: (data) => api.post('/booking/requests/review', data),
  // Chỉ admin: backend chặn ở authorize('admin'), đây chỉ là đường gọi
  setRegistrantColor: (registrantId, color) =>
    api.patch(`/booking/registrants/${registrantId}/color`, { color }),
  setRequestsColor: (ids, color) => api.post('/booking/requests/color', { ids, color }),
  updateRequest: (requestId, patch) => api.patch(`/booking/requests/${requestId}`, patch),
  adminCancelRequest: (requestId) => api.delete(`/booking/requests/${requestId}`),
  createSlotFromRequests: (boardId, data) => api.post(`/booking/boards/${boardId}/requests/open-slot`, data),
  adminAddEntry: (slotId, data) => api.post(`/booking/slots/${slotId}/entries`, data),
  adminCancelEntry: (entryId) => api.delete(`/booking/entries/${entryId}`),

  // ---- xếp lịch (chỉ admin) ----
  listRegistrants: (params) => api.get('/booking/registrants', { params }),
  listPriceTiers: (registrantId) => api.get(`/booking/registrants/${registrantId}/price-tiers`),
  createPriceTier: (registrantId, data) => api.post(`/booking/registrants/${registrantId}/price-tiers`, data),
  updatePriceTier: (tierId, data) => api.put(`/booking/price-tiers/${tierId}`, data),
  deletePriceTier: (tierId) => api.delete(`/booking/price-tiers/${tierId}`),

  listPool: (boardId) => api.get(`/booking/boards/${boardId}/pool`),
  addToPool: (boardId, data) => api.post(`/booking/boards/${boardId}/pool`, data),
  removeFromPool: (itemId) => api.delete(`/booking/pool/${itemId}`),
  detachRequestToPool: (requestId) => api.post(`/booking/requests/${requestId}/detach`),
  scheduleFromPool: (itemId, data) => api.post(`/booking/pool/${itemId}/schedule`, data),

  assignToSlot: (slotId, data) => api.post(`/booking/slots/${slotId}/assign`, data),
  updateEntryPrice: (entryId, priceTierId) =>
    api.put(`/booking/entries/${entryId}/price`, { price_tier_id: priceTierId }),
  detachToPool: (entryId) => api.post(`/booking/entries/${entryId}/detach`),
  moveEntry: (entryId, data) => api.post(`/booking/entries/${entryId}/move`, data),
}

export default bookingService
