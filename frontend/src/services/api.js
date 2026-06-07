import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 120000, // 2 min for LLM calls
})

/**
 * Upload a PDF file and get back document metadata.
 * @param {File} file
 * @param {Function} onProgress - (percent: number) => void
 */
export async function uploadPDF(file, onProgress) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total))
      }
    }
  })
  return response.data
}

/**
 * Ask a question about an uploaded document.
 * @param {string} docId
 * @param {string} question
 */
export async function queryDocument(docId, question) {
  const response = await api.post('/query', { doc_id: docId, question })
  return response.data
}

/**
 * Fetch all uploaded documents.
 */
export async function listDocuments() {
  const response = await api.get('/documents')
  return response.data.documents
}

/**
 * Delete a document by ID.
 * @param {string} docId
 */
export async function deleteDocument(docId) {
  const response = await api.delete(`/documents/${docId}`)
  return response.data
}
