import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '../../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * React Error Boundary: fängt unbehandelte Fehler in der Komponentenhierarchie ab
 * und verhindert, dass die gesamte App abstürzt.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('React component error', {
      message: error.message,
      componentStack: info.componentStack ?? undefined,
    });
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div style={{ padding: '1rem', color: 'red' }}>
            Ein Fehler ist aufgetreten.
          </div>
        )
      );
    }
    return this.props.children;
  }
}
