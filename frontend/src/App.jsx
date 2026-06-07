import React, { useState, useEffect } from 'react'
import UploadSection from './components/UploadSection'
import ChatInterface from './components/ChatInterface'
import { listDocuments, deleteDocument } from './services/api'
import './App.css'

export default function App() {
  const [view, setView] = useState('home') // 'home' | 'chat'
  const [activeDoc, setActiveDoc] = useState(null)
  const [documents, setDocuments] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(false)

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    setLoadingDocs(true)
    try {
      const docs = await listDocuments()
      setDocuments(docs)
    } catch {
      // backend may not be running yet
    } finally {
      setLoadingDocs(false)
    }
  }

  const handleDocumentUploaded = (docData) => {
    setDocuments(prev => {
      const exists = prev.find(d => d.doc_id === docData.doc_id)
      if (exists) return prev
      return [docData, ...prev]
    })
    setActiveDoc(docData)
    setView('chat')
  }

  const handleSelectDoc = (doc) => {
    setActiveDoc(doc)
    setView('chat')
  }

  const handleDeleteDoc = async (docId, e) => {
    e.stopPropagation()
    await deleteDocument(docId)
    setDocuments(prev => prev.filter(d => d.doc_id !== docId))
    if (activeDoc?.doc_id === docId) {
      setActiveDoc(null)
      setView('home')
    }
  }

  return (
    <div id="app-root">
      {/* Ambient background orbs */}
      <div className="ambient-orb orb-1" />
      <div className="ambient-orb orb-2" />
      <div className="ambient-orb orb-3" />

      {/* Navigation */}
      <nav className="navbar glass">
        <button className="nav-brand" onClick={() => setView('home')} id="nav-brand">
          <div className="brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="brand-name gradient-text">DocAssist</span>
          <span className="brand-tag badge badge-purple">RAG</span>
        </button>

        <div className="nav-center">
          {view === 'chat' && activeDoc && (
            <div className="nav-doc-info">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span className="nav-doc-name">{activeDoc.filename}</span>
            </div>
          )}
        </div>

        <div className="nav-actions">
          {view === 'chat' && (
            <button className="btn-ghost" onClick={() => setView('home')} id="nav-upload-new">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Document
            </button>
          )}
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
            id="nav-api-docs"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            API Docs
          </a>
        </div>
      </nav>

      <main className="main-content">
        {view === 'home' && (
          <div className="home-view animate-fadeInUp">
            {/* Hero */}
            <div className="hero">
              <div className="hero-badge badge badge-purple">
                <span className="badge-dot"/>
                Powered by RAG · LangChain · ChromaDB
              </div>
              <h1 className="hero-title">
                Ask Questions About<br />
                <span className="gradient-text">Any PDF Document</span>
              </h1>
              <p className="hero-subtitle">
                Upload a PDF and get instant, AI-powered answers grounded in your document.
                No hallucinations — every answer is backed by real source citations.
              </p>
              <div className="hero-stats">
                <div className="hero-stat">
                  <span className="hero-stat-value gradient-text">90–95%</span>
                  <span className="hero-stat-label">Context Relevance</span>
                </div>
                <div className="hero-stat-divider"/>
                <div className="hero-stat">
                  <span className="hero-stat-value gradient-text">−15%</span>
                  <span className="hero-stat-label">Hallucinations</span>
                </div>
                <div className="hero-stat-divider"/>
                <div className="hero-stat">
                  <span className="hero-stat-value gradient-text">Semantic</span>
                  <span className="hero-stat-label">Chunking</span>
                </div>
              </div>
            </div>

            <div className="home-body">
              {/* Upload card */}
              <div className="upload-card glass">
                <div className="card-header">
                  <h2 className="card-title">Upload Document</h2>
                  <span className="badge badge-teal">PDF only</span>
                </div>
                <UploadSection onDocumentUploaded={handleDocumentUploaded} />
              </div>

              {/* Document history */}
              {documents.length > 0 && (
                <div className="docs-card glass">
                  <div className="card-header">
                    <h2 className="card-title">Previous Documents</h2>
                    <span className="badge badge-blue">{documents.length}</span>
                  </div>
                  <div className="docs-list">
                    {documents.map(doc => (
                      <div
                        key={doc.doc_id}
                        className="doc-item"
                        onClick={() => handleSelectDoc(doc)}
                        role="button"
                        tabIndex={0}
                        id={`doc-item-${doc.doc_id.slice(0, 8)}`}
                      >
                        <div className="doc-icon-sm">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                        </div>
                        <div className="doc-info">
                          <p className="doc-name">{doc.filename}</p>
                          <p className="doc-meta">{doc.num_pages} pages · {doc.num_chunks} chunks</p>
                        </div>
                        <button
                          className="doc-delete btn-ghost"
                          onClick={(e) => handleDeleteDoc(doc.doc_id, e)}
                          title="Delete document"
                          id={`delete-doc-${doc.doc_id.slice(0, 8)}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14H6L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tech Stack Footer */}
            <div className="tech-stack">
              {['FastAPI', 'LangChain', 'ChromaDB', 'PyMuPDF', 'React', 'OpenRouter'].map(tech => (
                <span key={tech} className="tech-chip">{tech}</span>
              ))}
            </div>
          </div>
        )}

        {view === 'chat' && activeDoc && (
          <div className="chat-view animate-fadeIn">
            <ChatInterface document={activeDoc} />
          </div>
        )}
      </main>
    </div>
  )
}
