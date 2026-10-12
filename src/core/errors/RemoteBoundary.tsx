import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Alert } from '../../shared/ui/Alert';
import { Button } from '../../shared/ui/Button';

interface RemoteBoundaryProps {
  /** Name of the portal for the person ("Catálogo"). */
  title: string;
  onRetry: () => void;
  children: ReactNode;
}

/**
 * Error Boundary around one portal (Annex H, "Un portal caído no tumba la aplicación"): whether
 * its remoteEntry cannot be downloaded or it fails while rendering, only its area warns; the
 * header, the navigation and the other portals keep working.
 */
export class RemoteBoundary extends Component<RemoteBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Portal "${this.props.title}" failed`, error, info.componentStack);
  }

  private retry = () => {
    this.setState({ failed: false });
    this.props.onRetry();
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="stack">
        <Alert variant="error">
          {this.props.title} no está disponible en este momento. El resto de la plataforma sigue
          funcionando.
        </Alert>
        <div>
          <Button variant="secondary" onClick={this.retry}>
            Intentar de nuevo
          </Button>
        </div>
      </div>
    );
  }
}
