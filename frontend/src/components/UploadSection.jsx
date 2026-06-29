import React, { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { uploadPDF } from '../services/api'
import './UploadSection.css'

const MAX_SIZE = 50 * 1024 * 1024

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function UploadSection({ onDocumentUploaded }) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadState, setUploadState] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [pendingFile, setPendingFile] = useState(null)
  const fileInputRef = useRef(null)

  const validateAndPreview = (file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a PDF file.')
      return
    }
    if (file.size > MAX_SIZE) {
      toast.error('File is too large. Maximum size is 50 MB.')
      return
    }
    setPendingFile(file)
    setUploadState('preview')
  }

  const confirmUpload = async () => {
    if (!pendingFile) return
    setUploadState('uploading')
    setProgress(0)
    setErrorMsg('')

    try {
      const data = await uploadPDF(pendingFile, setProgress)
      setResult(data)
      setUploadState('success')
      toast.success(`"${data.filename}" processed — ${data.num_chunks} chunks ready.`)
      onDocumentUploaded(data)
    } catch (err) {
      const msg = err.userMessage || 'Upload failed. Please try again.'
      setErrorMsg(msg)
      setUploadState('error')
      toast.error(msg)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    validateAndPreview(e.dataTransfer.files[0])
  }

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = () => setIsDragging(false)

  const reset = () => {
    setUploadState('idle')
    setProgress(0)
    setResult(null)
    setErrorMsg('')
    setPendingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setTimeout(() => fileInputRef.current?.focus(), 50)
  }

  return (
    <div className="upload-section">
      {uploadState === 'idle' && (
        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
          aria-label="PDF upload area. Click or drag and drop a PDF file to upload"
        >
          <div className="drop-icon">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <polyline points="9 15 12 12 15 15"/>
            </svg>
          </div>
          <h3 className="drop-title">Drop your PDF here</h3>
          <p className="drop-subtitle">or click to browse files</p>
          <span className="drop-hint">Supports PDF files up to 50 MB</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={e => validateAndPreview(e.target.files[0])}
            aria-hidden="true"
          />
        </div>
      )}

      {uploadState === 'preview' && pendingFile && (
        <div className="file-preview animate-fadeInUp">
          <div className="preview-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div className="preview-info">
            <p className="preview-name">{pendingFile.name}</p>
            <p className="preview-size">{formatBytes(pendingFile.size)} · PDF Document</p>
          </div>
          <div className="preview-actions">
            <button className="btn-primary preview-upload-btn" onClick={confirmUpload}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 16 12 12 8 16"/>
                <line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
              Process PDF
            </button>
            <button className="btn-ghost" onClick={reset}>
              Choose Different
            </button>
          </div>
        </div>
      )}

      {uploadState === 'uploading' && (
        <div className="upload-progress" role="status" aria-live="polite" aria-label={`Uploading: ${progress}%`}>
          <div className="progress-steps">
            <div className={`progress-step ${progress >= 33 ? 'done' : 'active'}`}>
              <span className="step-dot" />
              <span>Reading PDF</span>
            </div>
            <div className="progress-step-line" />
            <div className={`progress-step ${progress >= 66 ? 'done' : progress >= 33 ? 'active' : ''}`}>
              <span className="step-dot" />
              <span>Chunking</span>
            </div>
            <div className="progress-step-line" />
            <div className={`progress-step ${progress >= 99 ? 'done' : progress >= 66 ? 'active' : ''}`}>
              <span className="step-dot" />
              <span>Embedding</span>
            </div>
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-footer">
            <span className="progress-pct">{progress}%</span>
            <span className="progress-note">Extracting text & creating vector embeddings…</span>
          </div>
        </div>
      )}

      {uploadState === 'success' && result && (
        <div className="upload-success animate-fadeInUp">
          <div className="success-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h3 className="success-title">{result.filename}</h3>
          <div className="success-stats">
            <div className="stat">
              <span className="stat-value">{result.num_pages}</span>
              <span className="stat-label">Pages</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-value">{result.num_chunks}</span>
              <span className="stat-label">Chunks</span>
            </div>
          </div>
          <p className="success-msg">{result.message}</p>
          <button className="btn-ghost" onClick={reset}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 16 12 12 8 16"/>
              <line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
            Upload Another
          </button>
        </div>
      )}

      {uploadState === 'error' && (
        <div className="upload-error animate-fadeInUp" role="alert">
          <div className="error-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </div>
          <p className="error-msg">{errorMsg}</p>
          <button className="btn-ghost" onClick={reset}>Try Again</button>
        </div>
      )}
    </div>
  )
}
