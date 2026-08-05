import api from './api'

const shopService = {
  getWallet: () => api.get('/shop/wallet'),
  listItems: () => api.get('/shop/items'),
  purchase: (itemId) => api.post(`/shop/items/${itemId}/purchase`).then((r) => r.data.data),
  listLedger: (limit = 20) => api.get('/shop/ledger', { params: { limit } }),
  getPlayAccess: (slug) => api.get(`/shop/play/${slug}`).then((r) => r.data.data),
  getSave: (slug) => api.get(`/shop/saves/${slug}`).then((r) => r.data.data),
  putSave: (slug, saveData) =>
    api.put(`/shop/saves/${slug}`, { save_data: saveData }).then((r) => r.data.data),
  deleteSave: (slug) => api.delete(`/shop/saves/${slug}`).then((r) => r.data.data),
  getContent: (slug) => api.get(`/shop/content/${slug}`).then((r) => r.data.data),
  putContent: (slug, payload) =>
    api.put(`/shop/content/${slug}`, { payload }).then((r) => r.data.data),
  resetContent: (slug) =>
    api.post(`/shop/content/${slug}/reset`).then((r) => r.data.data),
}

export default shopService
