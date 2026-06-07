import React, { useState, useRef } from 'react'
import { uploadPDF } from '../services/api'
import './UploadSection.css'

export default function UploadSection({ onDocumentUploaded }) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadState, setUploadState] = useState('idle') // idle | uploading | success | error
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const fileInputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Please upload a PDF file.')
      setUploadState('error')
      return
    }

    setUploadState('uploading')
    setProgress(0)
    setErrorMsg('')

    try {
      const data = await uploadPDF(file, setProgress)
      setResult(data)
      setUploadState('success')
      onDocumentUploaded(data)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Upload failed. Please try again.'
      setErrorMsg(msg)
      setUploadState('error')
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = () => setIsDragging(false)

  const reset = () => {
    setUploadState('idle')
    setProgress(0)
    setResult(null)
    setErrorMsg('')
  }

  return (
    <div className="upload-section">
      {uploadState === 'idle' && (
        <div
          className={`drop-zone glass ${isDragging ? 'dragging' : ''}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          id="upload-dropzone"
        >
          <div className="drop-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <polyline points="9 15 12 12 15 15"/>
            </svg>
          </div>
          <h3 className="drop-title">Drop your PDF here</h3>
          <p className="drop-subtitle">or click to browse files</p>
          <span className="drop-hint">Supports PDF files up to 50MB</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files[0])}
            id="file-input"
          />
        </div>
      )}

      {uploadState === 'uploading' && (
        <div className="upload-progress glass">
          <div className="progress-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <p className="progress-label">Processing your document…</p>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-pct">{progress}%</span>
          <p className="progress-note">Extracting text, creating semantic chunks & embeddings</p>
        </div>
      )}

      {uploadState === 'success' && result && (
        <div className="upload-success glass animate-fadeInUp">
          <div className="success-icon">✓</div>
          <h3 className="success-title">{result.filename}</h3>
          <div className="success-stats">
            <div className="stat">
              <span className="stat-value">{result.num_pages}</span>
              <span className="stat-label">Pages</span>
            </div>
            <div className="stat-divider"/>
            <div className="stat">
              <span className="stat-value">{result.num_chunks}</span>
              <span className="stat-label">Chunks</span>
            </div>
          </div>
          <p className="success-msg">{result.message}</p>
          <button className="btn-ghost" onClick={reset} id="upload-another-btn">
            ↑ Upload Another
          </button>
        </div>
      )}

      {uploadState === 'error' && (
        <div className="upload-error glass animate-fadeInUp">
          <div className="error-icon">✕</div>
          <p className="error-msg">{errorMsg}</p>
          <button className="btn-ghost" onClick={reset} id="retry-upload-btn">Try Again</button>
        </div>
      )}
    </div>
  )
}
