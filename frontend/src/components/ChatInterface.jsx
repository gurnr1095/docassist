import React, { useState, useRef, useEffect } from 'react'
import { queryDocument } from '../services/api'
import MessageBubble from './MessageBubble'
import SourceCard from './SourceCard'
import Loader from './Loader'
import './ChatInterface.css'

const SUGGESTED_QUESTIONS = [
  'What is the main topic of this document?',
  'Summarize the key findings.',
  'What conclusions are drawn?',
  'List the most important points.',
]

export default function ChatInterface({ document }) {
  const [messages, setMessages] = useState([
    {
      id: 0,
      role: 'assistant',
      content: `👋 Hello! I've analyzed **${document.filename}** (${document.num_pages} pages, ${document.num_chunks} chunks indexed). Ask me anything about it!`,
      time: now(),
      sources: []
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeSourcesId, setActiveSourcesId] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  function now() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const sendMessage = async (question) => {
    const q = (question || input).trim()
    if (!q || isLoading) return

    const userMsg = { id: Date.now(), role: 'user', content: q, time: now(), sources: [] }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const data = await queryDocument(document.doc_id, q)
      const aiMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.answer,
        time: now(),
        sources: data.sources || []
      }
      setMessages(prev => [...prev, aiMsg])
      setActiveSourcesId(aiMsg.id)
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Something went wrong. Please try again.'
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: `❌ Error: ${errMsg}`,
        time: now(),
        sources: []
      }])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const activeSources = messages.find(m => m.id === activeSourcesId)?.sources || []

  return (
    <div className="chat-layout">
      {/* Chat Panel */}
      <div className="chat-panel glass">
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="doc-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div>
              <h2 className="chat-doc-name">{document.filename}</h2>
              <p className="chat-doc-meta">{document.num_pages} pages · {document.num_chunks} chunks · Llama 3.3 8B</p>
            </div>
          </div>
          <div className="chat-status">
            <span className="status-dot"/>
            <span>Ready</span>
          </div>
        </div>

        <div className="messages-area">
          {messages.map(msg => (
            <div key={msg.id}>
              <MessageBubble message={msg} />
              {msg.role === 'assistant' && msg.sources.length > 0 && (
                <button
                  className={`sources-toggle ${activeSourcesId === msg.id ? 'active' : ''}`}
                  onClick={() => setActiveSourcesId(activeSourcesId === msg.id ? null : msg.id)}
                  id={`sources-toggle-${msg.id}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  {msg.sources.length} source{msg.sources.length !== 1 ? 's' : ''} used
                </button>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="loading-bubble animate-fadeIn">
              <div className="typing-indicator">
                <span/><span/><span/>
              </div>
              <p className="loading-label">Searching document & generating answer…</p>
            </div>
          )}
          <div ref={messagesEndRef}/>
        </div>

        {/* Suggested questions (show only at start) */}
        {messages.length === 1 && (
          <div className="suggestions">
            <p className="suggestions-label">Try asking:</p>
            <div className="suggestions-grid">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  className="suggestion-chip"
                  onClick={() => sendMessage(q)}
                  id={`suggestion-${i}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="chat-input-area">
          <div className="input-wrapper glass">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your document…"
              className="chat-input"
              rows={1}
              disabled={isLoading}
              id="chat-input"
            />
            <button
              className="send-btn btn-primary"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              id="send-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          <p className="input-hint">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </div>

      {/* Sources Panel */}
      {activeSources.length > 0 && (
        <div className="sources-panel glass animate-fadeIn">
          <div className="sources-header">
            <h3 className="sources-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Retrieved Sources
            </h3>
            <span className="badge badge-purple">{activeSources.length} chunks</span>
          </div>
          <p className="sources-subtitle">Most relevant document sections used to generate the answer</p>
          <div className="sources-list">
            {activeSources.map((source, i) => (
              <SourceCard key={i} source={source} index={i}/>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
