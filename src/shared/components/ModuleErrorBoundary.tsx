import { Component, type ReactNode, type ErrorInfo } from 'react'
import { ErrorState } from './ErrorState'

interface ModuleErrorBoundaryProps {
  children: ReactNode
  moduleName?: string
}

interface ModuleErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ModuleErrorBoundary extends Component<ModuleErrorBoundaryProps, ModuleErrorBoundaryState> {
  constructor(props: ModuleErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ModuleErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[${this.props.moduleName ?? 'Module'}ErrorBoundary]`, error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          title="Something went wrong"
          message={this.state.error?.message ?? 'An unexpected error occurred in this section.'}
          onRetry={this.handleRetry}
        />
      )
    }

    return this.props.children
  }
}
