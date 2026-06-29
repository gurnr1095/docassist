import React, { useState, useRef, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { queryDocument } from '../services/api'
import MessageBubble from './MessageBubble'
import SourceCard from './SourceCard'
import './ChatInterface.css'

const SUGGESTED_QUESTIONS = [
  'What is the main topic of this document?',
  'Summarize the key findings.',
  'What conclusions are drawn?',
  'List the most important points.',
]

const MAX_CHARS = 2000

function formatModelName(modelId) {
  if (!modelId) return 'AI Model'
  const name = (modelId.split('/').pop() || modelId)
    .replace(/-/g, ' ')
    .replace(/\b(instruct|latest|v\d+)\b/gi, '')
    .trim()
    .replace(/\s+/g, ' ')
  return name.replace(/\b\w/g, c => c.toUpperCase())
}

function makeWelcome(document) {
  return {
    id: 0,
    role: 'assistant',
    content: `Hello! I've analyzed **${document.filename}** (${document.num_pages} pages, ${document.num_chunks} chunks indexed). Ask me anything about it!`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    sources: [],
  }
}

export default function ChatInterface({ document }) {
  const [messages, setMessages] = useState(() => [makeWelcome(document)])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeSourcesId, setActiveSourcesId] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const autoResize = useCallback((el) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [])

  const handleInputChange = (e) => {
    setInput(e.target.value)
    autoResize(e.target)
  }

  const sendMessage = async (question) => {
    const q = (question || input).trim()
    if (!q || isLoading) return
    if (q.length > MAX_CHARS) {
      toast.error(`Question is too long — max ${MAX_CHARS} characters.`)
      return
    }

    const userMsg = { id: Date.now(), role: 'user', content: q, time: now(), sources: [] }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
    setIsLoading(true)

    try {
      const data = await queryDocument(document.doc_id, q)
      const aiMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.answer,
        time: now(),
        sources: data.sources || [],
      }
      setMessages(prev => [...prev, aiMsg])
      setActiveSourcesId(aiMsg.id)
    } catch (err) {
      toast.error(err.userMessage || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const clearChat = () => {
    setMessages([makeWelcome(document)])
    setActiveSourcesId(null)
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const activeSources = messages.find(m => m.id === activeSourcesId)?.sources || []
  const modelLabel = formatModelName(document.model)
  const charsLeft = MAX_CHARS - input.length
  const showCounter = input.length > MAX_CHARS - 300

  return (
    <div className="chat-layout">
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
              <p className="chat-doc-meta">
                {document.num_pages} pages · {document.num_chunks} chunks · {modelLabel}
              </p>
            </div>
          </div>
          <div className="chat-header-actions">
            {messages.length > 1 && (
              <button
                className="btn-ghost clear-btn"
                onClick={clearChat}
                title="Clear conversation"
                aria-label="Clear conversation"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>
                Clear
              </button>
            )}
            <div className="chat-status">
              <span className="status-dot" />
              <span>Ready</span>
            </div>
          </div>
        </div>

        <div className="messages-area" role="log" aria-label="Chat messages" aria-live="polite">
          {messages.map(msg => (
            <div key={msg.id}>
              <MessageBubble message={msg} />
              {msg.role === 'assistant' && msg.sources.length > 0 && (
                <button
                  className={`sources-toggle ${activeSourcesId === msg.id ? 'active' : ''}`}
                  onClick={() => setActiveSourcesId(activeSourcesId === msg.id ? null : msg.id)}
                  aria-expanded={activeSourcesId === msg.id}
                  aria-label={`${msg.sources.length} source${msg.sources.length !== 1 ? 's' : ''} used`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  {msg.sources.length} source{msg.sources.length !== 1 ? 's' : ''} used
                </button>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="loading-bubble animate-fadeIn" role="status" aria-live="polite" aria-label="Generating answer">
              <div className="typing-indicator">
                <span /><span /><span />
              </div>
              <p className="loading-label">Searching document & generating answer…</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length === 1 && !isLoading && (
          <div className="suggestions">
            <p className="suggestions-label">Try asking:</p>
            <div className="suggestions-grid">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  className="suggestion-chip"
                  onClick={() => sendMessage(q)}
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
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your document…"
              className="chat-input"
              rows={1}
              disabled={isLoading}
              aria-label="Ask a question about your document"
              maxLength={MAX_CHARS}
            />
            <button
              className="send-btn btn-primary"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          <div className="input-footer">
            <span className="input-hint">Enter to send · Shift+Enter for new line</span>
            {showCounter && (
              <span className={`char-counter ${charsLeft < 100 ? 'warn' : ''}`}>
                {charsLeft} left
              </span>
            )}
          </div>
        </div>
      </div>

      {activeSources.length > 0 && (
        <div className="sources-panel glass animate-fadeIn" aria-label="Retrieved sources">
          <div className="sources-header">
            <h3 className="sources-title">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Retrieved Sources
            </h3>
            <span className="badge badge-purple">{activeSources.length} chunks</span>
          </div>
          <p className="sources-subtitle">Most relevant sections used to generate the answer</p>
          <div className="sources-list">
            {activeSources.map((source, i) => (
              <SourceCard key={i} source={source} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
