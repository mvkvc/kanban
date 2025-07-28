import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'An unknown error occurred';
      return this.renderError(
        'Something went wrong',
        errorMessage,
        'Go to Home',
        this.handleGoHome
      );
    }

    return this.props.children;
  }

  private renderError(
    title: string,
    message: string,
    actionLabel: string,
    onAction: () => void
  ) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-background">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg shadow-lg bg-base-100">
          <h2 className="text-2xl font-bold text-error">{title}</h2>
          <p className="text-base-content text-center">{message}</p>
          <button 
            className="btn btn-primary mt-4"
            onClick={onAction}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    );
  }
}
