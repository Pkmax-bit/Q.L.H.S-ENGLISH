import api from './api'

const messengerService = {
  listGroups: () => api.get('/messenger/groups').then((r) => r.data.data),
  createGroup: (payload) => api.post('/messenger/groups', payload).then((r) => r.data.data),
  createDirect: (peerUserId) => api.post('/messenger/direct', { peer_user_id: peerUserId }).then((r) => r.data.data),
  ensureClassChat: (classId) => api.post(`/messenger/classes/${classId}/ensure`).then((r) => r.data.data),
  listContacts: () => api.get('/messenger/contacts').then((r) => r.data.data),
  getMessages: (groupId) => api.get(`/messenger/groups/${groupId}/chat`).then((r) => r.data.data),
  sendMessage: (groupId, content, replyTo = null) =>
    api.post(`/messenger/groups/${groupId}/chat`, { content, reply_to: replyTo }).then((r) => r.data.data),
  sendFile: (groupId, file, content = '') => {
    const form = new FormData()
    form.append('file', file)
    if (content) form.append('content', content)
    return api.post(`/messenger/groups/${groupId}/chat`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data)
  },
  markRead: (groupId) => api.patch(`/messenger/groups/${groupId}/read`).then((r) => r.data.data),
}

export default messengerService
