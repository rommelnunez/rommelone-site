"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      const err = this.state.error as Error & { digest?: string; [key: string]: unknown };
      const extras: Record<string, unknown> = {};
      for (const key of Object.getOwnPropertyNames(err)) {
        if (!["name", "message", "stack"].includes(key)) {
          extras[key] = (err as Record<string, unknown>)[key];
        }
      }
      return (
        <div style={{ padding: 40, color: "#fff", background: "#000", fontFamily: "inherit", whiteSpace: "pre-wrap" }}>
          <h2>Client Error Caught</h2>
          <p><strong>{err.name}:</strong> {err.message}</p>
          {err.digest && <p><strong>Digest:</strong> {err.digest}</p>}
          <p><strong>All properties:</strong> {JSON.stringify(extras, null, 2)}</p>
          <pre style={{ fontSize: 12, opacity: 0.7, marginTop: 16 }}>{err.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
