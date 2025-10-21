// src/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error?: Error };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: undefined };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("ErrorBoundary:", error, info);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui" }}>
          <h2>Ocorreu um erro na UI</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {String(this.state.error.message || this.state.error)}
          </pre>
          <p>Veja o Console do navegador para detalhes.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
