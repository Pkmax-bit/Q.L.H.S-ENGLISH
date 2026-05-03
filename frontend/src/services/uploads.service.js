import api from './api'

const uploadsService = {
  /** @param {File[]} files */
  uploadMany: (files) => {
    const formData = new FormData()
    for (const f of files) {
      formData.append('files', f)
    }
    return api.post('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export default uploadsService
