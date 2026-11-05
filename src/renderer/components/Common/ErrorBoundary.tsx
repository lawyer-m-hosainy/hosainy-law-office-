import React, { Component, ErrorInfo, ReactNode } from 'react';
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
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[350px] p-8 text-center bg-white rounded-2xl border border-red-200 shadow-sm m-6 space-y-4 font-cairo">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {this.props.fallbackTitle || 'حدث خطأ غير متوقع أثناء عرض هذه الصفحة'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              يمكنك محاولة إعادة تحميل الصفحة أو العودة إلى لوحة التحكم الرئيسية.
            </p>
          </div>
          {this.state.error && (
            <div className="bg-red-50/60 border border-red-100 rounded-lg p-3 text-[11px] font-mono text-red-700 max-w-lg overflow-x-auto text-right dir-ltr">
              {this.state.error.message || String(this.state.error)}
            </div>
          )}
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors shadow-sm" data-testid="app.main.handle-reset"
          >
            <RefreshCw className="w-4 h-4" />
            <span>إعادة محاولة فتح الصفحة</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
