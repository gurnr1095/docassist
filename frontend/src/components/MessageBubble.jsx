import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './MessageBubble.css'

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`bubble-wrapper ${isUser ? 'user' : 'assistant'} animate-fadeInUp`}>
      <div className="bubble-avatar">
        {isUser ? (
          <span className="avatar-user">You</span>
        ) : (
          <div className="avatar-ai">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
          </div>
        )}
      </div>

      <div className={`bubble-content ${isUser ? 'bubble-user' : 'bubble-ai'}`}>
        {isUser ? (
          <p className="bubble-text">{message.content}</p>
        ) : (
          <div className="bubble-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        <span className="bubble-time">{message.time}</span>
      </div>
    </div>
  )
}
