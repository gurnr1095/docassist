import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import UploadSection from './components/UploadSection'
import ChatInterface from './components/ChatInterface'
import { listDocuments, deleteDocument } from './services/api'
import './App.css'

const SWAGGER_URL = import.meta.env.VITE_SWAGGER_URL ?? '/docs'

export default function App() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') !== 'light')
  const [view, setView] = useState('home')
  const [activeDoc, setActiveDoc] = useState(null)
  const [documents, setDocuments] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    setLoadingDocs(true)
    try {
      const docs = await listDocuments()
      setDocuments(docs)
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[App] Could not fetch documents:', err.userMessage)
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
    try {
      await deleteDocument(docId)
      setDocuments(prev => prev.filter(d => d.doc_id !== docId))
      if (activeDoc?.doc_id === docId) {
        setActiveDoc(null)
        setView('home')
      }
      toast.success('Document deleted.')
    } catch (err) {
      toast.error(err.userMessage || 'Failed to delete document.')
    }
  }

  const filteredDocs = documents.filter(d =>
    d.filename.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const HOW_STEPS = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/>
        </svg>
      ),
      step: '01',
      label: 'Upload PDF',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      ),
      step: '02',
      label: 'AI Indexes',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
      step: '03',
      label: 'Ask Anything',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ),
      step: '04',
      label: 'Cited Answers',
    },
  ]

  return (
    <div id="app-root">
      <div className="ambient-orb orb-1" />
      <div className="ambient-orb orb-2" />
      <div className="ambient-orb orb-3" />

      <nav className="navbar glass">
        <button className="nav-brand" onClick={() => setView('home')} aria-label="Go to home">
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
            <button className="btn-ghost" onClick={() => setView('home')} aria-label="Upload new document">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>New</span>
            </button>
          )}

          <button
            className="btn-ghost theme-toggle"
            onClick={() => setIsDark(d => !d)}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          <a
            href={SWAGGER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
            aria-label="Open API documentation"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            API Docs
          </a>
        </div>
      </nav>

      <main className="main-content">
        {view === 'home' && (
          <div className="home-view animate-fadeInUp">
            <div className="hero">
              <div className="hero-badge badge badge-purple">
                <span className="badge-dot" />
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
                <div className="hero-stat-divider" />
                <div className="hero-stat">
                  <span className="hero-stat-value gradient-text">−15%</span>
                  <span className="hero-stat-label">Hallucinations</span>
                </div>
                <div className="hero-stat-divider" />
                <div className="hero-stat">
                  <span className="hero-stat-value gradient-text">Semantic</span>
                  <span className="hero-stat-label">Chunking</span>
                </div>
              </div>
            </div>

            <div className="how-it-works">
              {HOW_STEPS.map(({ icon, step, label }, i) => (
                <React.Fragment key={step}>
                  <div className="how-step">
                    <div className="how-step-icon">{icon}</div>
                    <span className="how-step-num">{step}</span>
                    <span className="how-step-label">{label}</span>
                  </div>
                  {i < HOW_STEPS.length - 1 && (
                    <div className="how-step-connector">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="home-body">
              <div className="upload-card glass">
                <div className="card-header">
                  <h2 className="card-title">Upload Document</h2>
                  <span className="badge badge-teal">PDF only</span>
                </div>
                <UploadSection onDocumentUploaded={handleDocumentUploaded} />
              </div>

              <div className="docs-card glass">
                <div className="card-header">
                  <h2 className="card-title">Your Documents</h2>
                  {documents.length > 0 && (
                    <span className="badge badge-blue">{documents.length}</span>
                  )}
                </div>

                {documents.length > 3 && (
                  <div className="docs-search-wrap">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="docs-search-icon">
                      <circle cx="11" cy="11" r="8"/>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      type="text"
                      className="docs-search"
                      placeholder="Search documents…"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      aria-label="Search documents"
                    />
                    {searchQuery && (
                      <button className="docs-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear search">✕</button>
                    )}
                  </div>
                )}

                {loadingDocs ? (
                  <div className="docs-empty">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="docs-spinner">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    <p className="docs-empty-text">Loading…</p>
                  </div>
                ) : filteredDocs.length > 0 ? (
                  <div className="docs-list">
                    {filteredDocs.map((doc, i) => (
                      <div
                        key={doc.doc_id}
                        className="doc-item animate-fadeInUp"
                        style={{ animationDelay: `${i * 0.04}s` }}
                        onClick={() => handleSelectDoc(doc)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleSelectDoc(doc)}
                        aria-label={`Open ${doc.filename}`}
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
                          onClick={e => handleDeleteDoc(doc.doc_id, e)}
                          aria-label={`Delete ${doc.filename}`}
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
                ) : searchQuery ? (
                  <div className="docs-empty">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="docs-empty-icon">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <p className="docs-empty-text">No matches for "{searchQuery}"</p>
                  </div>
                ) : (
                  <div className="docs-empty">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="docs-empty-icon">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="12" y1="18" x2="12" y2="12"/>
                      <line x1="9" y1="15" x2="15" y2="15"/>
                    </svg>
                    <p className="docs-empty-text">No documents yet</p>
                    <p className="docs-empty-sub">Upload a PDF to get started</p>
                  </div>
                )}
              </div>
            </div>

            <div className="tech-stack">
              {['FastAPI', 'LangChain', 'ChromaDB', 'PyMuPDF', 'React', 'Mistral'].map(tech => (
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
