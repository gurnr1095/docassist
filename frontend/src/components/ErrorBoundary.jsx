import React from 'react'

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh', gap: '16px', padding: '32px',
          color: '#e2e8f0', textAlign: 'center'
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h1 style={{ color: '#ef4444', margin: 0 }}>Something went wrong</h1>
          <p style={{ color: '#94a3b8', maxWidth: 480, margin: 0 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', cursor: 'pointer',
              fontSize: '14px', marginTop: '8px'
            }}
          >
            Reload App
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
