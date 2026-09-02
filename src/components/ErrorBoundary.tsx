import React, { Component, ErrorInfo, ReactNode } from 'react';
import { STORAGE_KEY } from '../store/StoreContext';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  /** Hand the log back before anything gets thrown away. */
  private downloadBackup = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || '{}';
      const blob = new Blob([raw], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nutrition-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      console.error('Could not export a backup:', e);
    }
  };

  private resetData = () => {
    const ok = window.confirm(
      'This permanently deletes every logged day, your favourites and your targets from this browser. Download a backup first if you have not already.\n\nDelete everything?',
    );
    if (!ok) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Could not clear stored data:', e);
    }
    window.location.reload();
  };

  public render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="p-6 max-w-lg mx-auto space-y-5">
        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-on-surface)]">Something broke</h1>
          <p className="text-xs text-[var(--color-on-surface-variant)] leading-relaxed">
            Reloading fixes most of these. Your logged data is untouched — only clear it as a last resort, and take a
            backup first.
          </p>
        </div>

        <pre className="text-[11px] bg-rose-500/10 text-rose-500 border border-rose-500/25 p-4 rounded-2xl overflow-auto max-h-40 whitespace-pre-wrap">
          {this.state.error?.message || 'Unknown error'}
        </pre>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-[var(--color-on-surface)] text-[var(--color-bg-base)] py-3.5 rounded-xl font-black text-xs cursor-pointer active:scale-95 transition-transform"
          >
            Reload the app
          </button>
          <button
            onClick={this.downloadBackup}
            className="w-full bg-[var(--color-surface-variant)] border border-[var(--color-outline)] text-[var(--color-on-surface)] py-3 rounded-xl font-bold text-xs cursor-pointer"
          >
            Download a backup
          </button>
          <button
            onClick={this.resetData}
            className="w-full border border-rose-500/40 text-rose-500 py-3 rounded-xl font-bold text-xs cursor-pointer"
          >
            Delete all data and reload
          </button>
        </div>
      </div>
    );
  }
}
