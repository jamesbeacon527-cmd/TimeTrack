import React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-md w-full space-y-4 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-rose-400 bg-clip-text text-transparent">Something went wrong</h1>
            <div className="bg-muted p-4 rounded-lg text-left text-sm font-mono overflow-auto border border-border">
              {this.state.error?.message || "Unknown error"}
            </div>
            <p className="text-muted-foreground text-sm">
              Please send a screenshot of this error to the developer.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
