import React, { useState } from 'react'
import './SourceCard.css'

export default function SourceCard({ source, index }) {
  const [expanded, setExpanded] = useState(false)
  const score = Math.round(source.score * 100)

  const scoreColor =
    score >= 80 ? '#10b981' :
    score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className={`source-card glass ${expanded ? 'expanded' : ''}`} id={`source-card-${index}`}>
      <button
        className="source-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="source-meta">
          <span className="source-index">#{index + 1}</span>
          <span className="source-page">Page {source.page}</span>
          <span className="source-score" style={{ color: scoreColor }}>
            {score}% match
          </span>
        </div>
        <div className="source-preview">
          {source.text.slice(0, 80)}…
        </div>
        <span className={`source-chevron ${expanded ? 'open' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </span>
      </button>

      {expanded && (
        <div className="source-body animate-fadeIn">
          <div className="divider"/>
          <p className="source-text">{source.text}</p>
          <div className="score-bar-track">
            <div
              className="score-bar-fill"
              style={{ width: `${score}%`, background: scoreColor }}
            />
          </div>
          <span className="score-label">Relevance: {score}%</span>
        </div>
      )}
    </div>
  )
}
