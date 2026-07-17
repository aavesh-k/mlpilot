import { Component, type ReactNode, type ErrorInfo } from 'react'
import { Button } from './ui/button'

interface GlobalErrorBoundaryProps {
  children: ReactNode
}

interface GlobalErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class GlobalErrorBoundary extends Component<GlobalErrorBoundaryProps, GlobalErrorBoundaryState> {
  constructor(props: GlobalErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): GlobalErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[GlobalErrorBoundary]', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4 text-center">
          <span className="material-symbols-outlined text-8xl text-secondary opacity-60 mb-6">error</span>
          <h1 className="font-headline text-3xl font-black uppercase mb-3">Critical Error</h1>
          <p className="text-on-surface-variant text-sm max-w-md mb-8">
            Something went wrong. Please reload the page to continue.
          </p>
          <Button variant="primary" size="lg" onClick={this.handleReload}>
            Reload Page
          </Button>
          {this.state.error && (
            <details className="mt-6 text-left max-w-lg">
              <summary className="cursor-pointer text-xs text-on-surface-variant font-mono">
                Error Details
              </summary>
              <pre className="mt-2 text-xs text-secondary font-mono whitespace-pre-wrap bg-surface-variant p-4 rounded">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
