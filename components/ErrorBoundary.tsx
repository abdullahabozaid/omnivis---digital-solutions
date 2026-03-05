import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

// Utility function to compare arrays
function arraysEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Error Boundary component to catch React errors
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (
      this.state.hasError &&
      this.props.resetKeys &&
      prevProps.resetKeys &&
      !arraysEqual(prevProps.resetKeys, this.props.resetKeys)
    ) {
      this.reset();
    }
  }

  reset(): void {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-lg w-full">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800">Something went wrong</h3>
                <p className="mt-1 text-sm text-red-600">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </p>
                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <details className="mt-3">
                    <summary className="text-xs text-red-500 cursor-pointer hover:text-red-700">Show error details</summary>
                    <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
                <button
                  onClick={this.reset}
                  className="mt-4 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component version
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const ComponentWithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}

// Hook for error handling in functional components
export function useErrorHandler(): (error: Error) => void {
  const [error, setError] = React.useState<Error | null>(null);

  if (error) {
    throw error;
  }

  return React.useCallback((e: Error) => {
    setError(e);
  }, []);
}

// Global error handler for unhandled promise rejections
export function setupGlobalErrorHandlers(
  onError?: (error: Error, source: 'error' | 'unhandledrejection') => void
): () => void {
  const handleError = (event: ErrorEvent) => {
    console.error('Global error:', event.error);
    if (onError) {
      onError(event.error || new Error(event.message), 'error');
    }
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    console.error('Unhandled promise rejection:', event.reason);
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));
    if (onError) {
      onError(error, 'unhandledrejection');
    }
  };

  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  return () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  };
}

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState extends ErrorBoundaryState {
  globalError: Error | null;
}

// App-level error boundary with global handler integration
export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  private cleanupGlobalHandlers: (() => void) | null = null;

  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      globalError: null,
    };
    this.reset = this.reset.bind(this);
    this.dismissGlobalError = this.dismissGlobalError.bind(this);
    this.handleRefresh = this.handleRefresh.bind(this);
  }

  componentDidMount(): void {
    this.cleanupGlobalHandlers = setupGlobalErrorHandlers((error, source) => {
      if (source === 'unhandledrejection') {
        this.setState({ globalError: error });
      }
    });
  }

  componentWillUnmount(): void {
    if (this.cleanupGlobalHandlers) {
      this.cleanupGlobalHandlers();
    }
  }

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('AppErrorBoundary caught an error:', error, errorInfo);
  }

  reset(): void {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      globalError: null,
    });
  }

  dismissGlobalError(): void {
    this.setState({ globalError: null });
  }

  handleRefresh(): void {
    window.location.reload();
  }

  render(): React.ReactNode {
    const { hasError, error, errorInfo, globalError } = this.state;

    if (globalError && !hasError) {
      return (
        <>
          {this.props.children}
          <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-red-600 text-white p-4 rounded-lg shadow-lg max-w-sm">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <p className="font-medium">An error occurred</p>
                  <p className="text-sm text-red-100 mt-1">{globalError.message}</p>
                </div>
                <button onClick={this.dismissGlobalError} className="text-red-200 hover:text-white">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </>
      );
    }

    if (hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-lg w-full shadow-sm">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="mt-4 text-2xl font-bold text-gray-900">Something went wrong</h1>
              <p className="mt-2 text-gray-600">We're sorry, but something unexpected happened. Please try refreshing the page.</p>
              {error && (
                <p className="mt-3 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error.message}</p>
              )}
              {process.env.NODE_ENV === 'development' && errorInfo && (
                <details className="mt-4 text-left">
                  <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">Show technical details</summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-3 rounded-lg overflow-auto max-h-60 text-left">
                    {errorInfo.componentStack}
                  </pre>
                </details>
              )}
              <div className="mt-6 flex gap-3 justify-center">
                <button onClick={this.reset} className="px-6 py-2.5 bg-gold-600 text-white font-medium rounded-lg hover:bg-gold-700 transition-colors">
                  Try again
                </button>
                <button onClick={this.handleRefresh} className="px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors">
                  Refresh page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
