import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Capturado erro de renderização:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900/90 border border-rose-500/30 rounded-2xl p-6 text-center shadow-2xl backdrop-blur-xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">
              {this.props.fallbackTitle || 'Falha temporária ao carregar painel'}
            </h2>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Ocorreu uma instabilidade na renderização dos dados. Os serviços de automação continuam operando normalmente em segundo plano.
            </p>
            {this.state.error?.message && (
              <div className="p-3 bg-black/40 rounded-xl text-left font-mono text-[11px] text-rose-300/80 mb-4 overflow-x-auto border border-rose-500/10 max-h-28">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Recarregar Painel</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
