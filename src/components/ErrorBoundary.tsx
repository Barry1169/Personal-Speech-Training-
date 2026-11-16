"use client";

import React from "react";

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("SpeechCoach runtime error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-6">
        <div className="card w-full max-w-md p-6">
          <p className="section-label">Something went wrong</p>
          <h2 className="mt-2 font-display text-[18px] font-semibold">The app hit an unexpected error</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
            Your data is safe — everything is stored locally in IndexedDB and was not affected. Reload to pick up where you left off.
          </p>
          <pre className="mt-3 max-h-32 overflow-auto rounded-lg bg-[var(--panel2)] p-3 text-[11px] leading-relaxed text-[var(--bad)]">
            {this.state.error.message}
          </pre>
          <div className="mt-4 flex gap-2">
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload app</button>
            <button className="btn btn-ghost" onClick={() => this.setState({ error: null })}>Try again</button>
          </div>
        </div>
      </div>
    );
  }
}
