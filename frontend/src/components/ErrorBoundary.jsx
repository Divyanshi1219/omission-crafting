import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            padding: "32px",
            textAlign: "center",
            color: "#0f172a",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "#fee2e2",
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
            }}
          >
            <AlertTriangle size={28} />
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
            Something went wrong rendering this view
          </h2>
          <p style={{ color: "#64748b", maxWidth: "480px", fontSize: "14px", marginBottom: "20px" }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#0f172a",
              color: "#ffffff",
              padding: "10px 18px",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "13px",
              border: "none",
              cursor: "pointer",
            }}
          >
            <RotateCcw size={15} />
            <span>Reload Page</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
