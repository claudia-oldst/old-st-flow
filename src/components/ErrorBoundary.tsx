import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Optional label shown in the fallback heading. */
  scope?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", this.props.scope ?? "root", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const isDev = import.meta.env.DEV;
    return (
      <div
        role="alert"
        className="min-h-[40vh] flex items-center justify-center p-6"
      >
        <div className="max-w-md w-full rounded-xl bg-surface-2 hairline p-6 space-y-4 text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-destructive/15 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-lg">Something went wrong</h2>
            <p className="text-sm text-dim">
              {this.props.scope
                ? `The ${this.props.scope} view hit an unexpected error.`
                : "An unexpected error occurred."}
            </p>
          </div>
          {isDev && (
            <pre className="text-left text-[11px] text-dimmer bg-black/30 hairline rounded-md p-2 overflow-auto max-h-40">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex justify-center gap-2">
            <Button variant="ghost" size="sm" onClick={this.reset}>
              Try again
            </Button>
            <Button size="sm" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
