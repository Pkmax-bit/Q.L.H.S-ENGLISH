import api from './api'

export default {
  listFeed: (params) => api.get('/social/feed', { params }).then((r) => r.data.data),
  getStats: () => api.get('/social/stats').then((r) => r.data.data),
  searchMembers: (q) => api.get('/social/members/search', { params: { q } }).then((r) => r.data.data),
  createPost: (formData) => api.post('/social/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data.data),
  deletePost: (id) => api.delete(`/social/posts/${id}`).then((r) => r.data.data),
  toggleLike: (id) => api.post(`/social/posts/${id}/like`).then((r) => r.data.data),
  listComments: (id) => api.get(`/social/posts/${id}/comments`).then((r) => r.data.data),
  addComment: (id, body) => api.post(`/social/posts/${id}/comments`, { body }).then((r) => r.data.data),
  getProfile: (userId) => api.get(`/social/profiles/${userId}`).then((r) => r.data.data),
  uploadImage: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/social/profile/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data)
  },
}
