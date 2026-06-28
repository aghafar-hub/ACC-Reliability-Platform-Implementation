// apps/owner-center/src/components/ErrorBoundary.tsx
// React class error boundary for the Owner Center shell.
//
// Catches unhandled render errors anywhere in the component tree below it
// and displays a safe fallback.  Implementation details are never surfaced
// to the user.

import React from 'react';

interface ErrorBoundaryProps {
  readonly children: React.ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
}

/**
 * Top-level error boundary wrapping the entire application.
 *
 * Catches render-phase errors and replaces the crashed subtree with a
 * minimal error screen.  All errors are logged to the console for
 * troubleshooting; stack traces are never shown to the end user.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Unhandled render error', error, info);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="error-screen" role="alert">
          <h1>Something went wrong.</h1>
          <p>Please refresh the page. If the problem persists, contact support.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
