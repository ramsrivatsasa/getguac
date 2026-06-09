'use client'
// Embedded (mobile WebView) error boundary. Prod client errors normally show
// the generic "Application error: a client-side exception" with the real
// message only in the console — which a WebView hides. This catches the error
// and prints the actual message + stack on screen so it's diagnosable from a
// screenshot.
import { Component } from 'react'

export default class EmbedErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { err: null }
  }

  static getDerivedStateFromError(err) {
    return { err }
  }

  componentDidCatch(err, info) {
    // eslint-disable-next-line no-console
    console.error('[embed] render error', err, info)
  }

  render() {
    if (this.state.err) {
      const e = this.state.err
      return (
        <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
          <p style={{ fontWeight: 800, color: '#b91c1c', marginBottom: 8 }}>This screen hit an error</p>
          <pre style={{
            fontSize: 11, color: '#7f1d1d', background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 8, padding: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowX: 'auto',
          }}>
            {String(e?.message || e)}
            {e?.stack ? `\n\n${e.stack}` : ''}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
