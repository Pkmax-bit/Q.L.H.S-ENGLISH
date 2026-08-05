import { Component } from 'react'

/**
 * Catches render errors so one broken child does not blank the whole app.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
            color: '#e2e8f0',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', fontWeight: 600 }}>
              Đã xảy ra lỗi
            </h1>
            <p style={{ opacity: 0.8, marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Một phần giao diện gặp sự cố. Bạn có thể tải lại trang hoặc quay về trang chủ.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: 8,
                  border: 'none',
                  background: '#38bdf8',
                  color: '#0f172a',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Tải lại
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: 8,
                  border: '1px solid #475569',
                  background: 'transparent',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                }}
              >
                Trang chủ
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
