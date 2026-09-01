import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 space-y-4 text-red-500">
          <h1 className="text-2xl font-bold">Something went wrong.</h1>
          <pre className="text-xs bg-red-500/10 p-4 rounded-xl overflow-auto">
            {this.state.error?.message}
          </pre>
          <button 
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-lg font-bold"
          >
            Clear Data & Reload
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
