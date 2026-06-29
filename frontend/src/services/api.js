import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 120000,
})

// Normalise every error so callers use err.userMessage instead of digging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail =
      error.response?.data?.detail ??
      error.message ??
      'An unexpected error occurred'
    if (import.meta.env.DEV) {
      console.error('[API]', error.config?.url, error.response?.status, detail)
    }
    error.userMessage = detail
    return Promise.reject(error)
  }
)

export async function uploadPDF(file, onProgress) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total))
      }
    },
  })
  return response.data
}

export async function queryDocument(docId, question) {
  const response = await api.post('/query', { doc_id: docId, question })
  return response.data
}

export async function listDocuments() {
  const response = await api.get('/documents', { timeout: 15000 })
  return response.data.documents
}

export async function deleteDocument(docId) {
  const response = await api.delete(`/documents/${docId}`, { timeout: 15000 })
  return response.data
}
