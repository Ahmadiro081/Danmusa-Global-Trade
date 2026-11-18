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
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="max-w-md w-full rounded-lg border border-slate-200 bg-white p-8 text-center space-y-4">
            <p className="font-mono text-xs font-semibold text-red-700">
              Application Error
            </p>
            <h1 className="font-display text-xl font-bold text-[#0B1E3D]">
              Something went wrong
            </h1>
            <p className="text-sm text-slate-600">{this.state.errorMessage}</p>
            <div className="pt-2 flex justify-center gap-3">
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
