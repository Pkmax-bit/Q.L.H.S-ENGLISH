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
  reviewRequests: (data) => api.post('/booking/requests/review', data),
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

  assignToSlot: (slotId, data) => api.post(`/booking/slots/${slotId}/assign`, data),
  updateEntryPrice: (entryId, priceTierId) =>
    api.put(`/booking/entries/${entryId}/price`, { price_tier_id: priceTierId }),
  detachToPool: (entryId) => api.post(`/booking/entries/${entryId}/detach`),
  moveEntry: (entryId, data) => api.post(`/booking/entries/${entryId}/move`, data),
}

export default bookingService
