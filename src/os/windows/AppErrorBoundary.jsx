import React, { Component } from 'react';

/**
 * Per-Window Error Boundary to insulate the desktop shell and other running windows
 * from unexpected runtime errors within individual applications.
 */
export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    console.error(
      '[AppErrorBoundary] Application failed. Close and reopen it to recover.',
    );
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '32px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center',
            color: '#ffffff',
            background: 'rgba(15, 23, 42, 0.95)',
          }}
          role="alert"
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚠️</div>
          <h3
            style={{
              margin: '0 0 8px 0',
              fontSize: '1.125rem',
              fontWeight: 700,
            }}
          >
            {this.props.appTitle || 'Application'} Encountered an Error
          </h3>
          <p
            style={{
              margin: '0 0 16px 0',
              fontSize: '0.8125rem',
              color: '#94a3b8',
              maxWidth: '400px',
              lineHeight: 1.4,
            }}
          >
            This application could not load. Retry, reload Elyx, or return home.
            Reloading locks the vault.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              background: '#6366f1',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              color: '#ffffff',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload Component
          </button>
          <button type="button" onClick={() => window.location.reload()}>
            Reload Elyx
          </button>
          <button type="button" onClick={() => window.location.assign('/')}>
            Return home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
