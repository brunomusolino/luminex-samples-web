import React from "react";

export class ErrorBoundary extends React.Component<{children: React.ReactNode},{error?: Error}> {
  constructor(props:any){ super(props); this.state = { error: undefined }; }
  static getDerivedStateFromError(error: Error){ return { error }; }
  componentDidCatch(err: any){ console.error("ErrorBoundary:", err); }
  render(){
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui" }}>
          <h2>Ocorreu um erro na UI</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{String(this.state.error.message || this.state.error)}</pre>
          <p>Veja o Console do navegador para detalhes.</p>
        </div>
      );
    }
    return this.props.children as any;
  }
}
