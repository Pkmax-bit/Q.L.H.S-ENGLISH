import api from './api'

const lessonBundlesService = {
  getAll: (params) => api.get('/lesson-bundles', { params }),
  getById: (id) => api.get(`/lesson-bundles/${id}`),
  create: (data) => api.post('/lesson-bundles', data),
  update: (id, data) => api.put(`/lesson-bundles/${id}`, data),
  delete: (id) => api.delete(`/lesson-bundles/${id}`),

  addItems: (id, lessonIds) =>
    api.post(`/lesson-bundles/${id}/items`, { lesson_ids: lessonIds }),
  removeItem: (id, lessonId) =>
    api.delete(`/lesson-bundles/${id}/items/${lessonId}`),
  reorderItems: (id, lessonIds) =>
    api.post(`/lesson-bundles/${id}/reorder`, { lesson_ids: lessonIds }),

  applyToClass: (id, classId, lessonIds) =>
    api.post(`/lesson-bundles/${id}/apply`, {
      class_id: classId,
      lesson_ids: lessonIds && lessonIds.length ? lessonIds : undefined,
    }),
}

export default lessonBundlesService
