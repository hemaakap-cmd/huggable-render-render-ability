/**
 * PanelErrorBoundary — page-level error containment for the portals.
 *
 * The root ErrorBoundary catches catastrophic failures, but a crash inside a
 * single admin/instructor/student page should not blank the whole app. This
 * boundary lives INSIDE each portal layout, so the sidebar and navigation
 * stay alive and the user can retry or move to another page without a full
 * reload.
 */
import { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Shown in the fallback so the user knows which area failed */
  panelName?: string;
}

interface State {
  hasError: boolean;
  message: string | null;
}

export default class PanelErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack, panel: this.props.panelName } });
  }

  private reset = () => this.setState({ hasError: false, message: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="max-w-xl mx-auto mt-12 text-center">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h2 className="font-display text-lg font-bold text-slate-900 mb-2">
            Something went wrong in {this.props.panelName ?? "this page"}
          </h2>
          <p className="text-sm text-slate-600 mb-1">
            The rest of the dashboard is still working — you can retry this page or use the sidebar to go elsewhere.
          </p>
          {this.state.message && (
            <p className="text-xs text-slate-400 font-mono mt-2 break-all">{this.state.message}</p>
          )}
          <button
            onClick={this.reset}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(220,91%,54%)] text-white text-sm font-semibold hover:bg-[hsl(220,91%,46%)] transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Try again
          </button>
        </div>
      </div>
    );
  }
}
