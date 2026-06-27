import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '60vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '16px',
        padding: '32px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '48px' }}>💥</div>
        <h2 style={{ fontSize: '22px', color: 'var(--text)' }}>Something went wrong</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '400px', fontSize: '14px' }}>
          {this.state.error?.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={() => this.setState({ hasError: false, error: null })}
          style={{
            padding: '10px 24px', background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer',
            fontSize: '14px', fontFamily: 'inherit',
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}
