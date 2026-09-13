import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button.js';
import { Card } from './Card.js';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
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
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 flex items-center justify-center min-h-[300px]">
          <Card className="max-w-md w-full p-6 text-center space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {this.props.fallbackTitle || 'Something went wrong in this view'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {this.state.error?.message || 'An unexpected error occurred while rendering this section.'}
              </p>
            </div>
            <div className="pt-2 flex justify-center">
              <Button
                variant="primary"
                size="sm"
                onClick={this.handleRetry}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Retry View
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
