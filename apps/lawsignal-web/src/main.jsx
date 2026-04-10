import { Component, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles.css";

function ErrorBoundaryFallback() {
  return (
    <div style={{
      padding: "40px",
      textAlign: "center",
      fontFamily: "var(--ff-b)",
      color: "var(--ink-2)",
    }}>
      <h2 style={{ fontFamily: "var(--ff-d)", fontSize: "24px", marginBottom: "12px" }}>
        Something went wrong
      </h2>
      <p>Reload the page to try again.</p>
    </div>
  );
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error("LawSignal crash:", error, info);
  }
  render() {
    if (this.state.hasError) return <ErrorBoundaryFallback />;
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
