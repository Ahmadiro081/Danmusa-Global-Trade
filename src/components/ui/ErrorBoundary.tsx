import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected rendering error occurred.',
    };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[DGT UI ErrorBoundary]', error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-4">
          <div className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#DC2626]">
              Application Error
            </p>
            <h1 className="font-display text-xl font-extrabold text-[#10243A]">
              Something went wrong
            </h1>
            <p className="text-sm text-[#64748B]">{this.state.errorMessage}</p>
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="primary" onClick={this.handleReset}>
                Retry View
              </Button>
              <a href="/">
                <Button variant="outline">Return Home</Button>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
