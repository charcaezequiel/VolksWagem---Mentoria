import React from 'react';
import { useTranslation } from '../../context/LanguageContext';

/**
 * Corta el error de una pagina para que no se caiga la aplicacion entera.
 *
 * Por que existe: sin esto, si un componente explota durante el render, React
 * lo desmonta todo. La pantalla queda en blanco, el menu lateral desaparece y
 * no hay ni un mensaje. En la practica es indistinguible de "la base de datos
 * no me carga nada", que es como se viene reportando el problema.
 *
 * Con el limite, el error queda contenido en la pagina donde ocurrio: el menu
 * sigue alive, el usuario puede ir a otra seccion y, si quiere, reintentar.
 *
 * Es un componente de clase a proposito: `componentDidCatch` y
 * `getDerivedStateFromError` son API de clase y no existen en hooks.
 *
 * NOTA: los labels se reciben por props y NO se llaman aca con useTranslation.
 * El limite de mas arriba envuelve a los providers, asi que si el
 * LanguageProvider fuera el que explota, un useTranslation dentro del propio
 * limite fallaria otra vez y no quedaria nada que mostrar. Por eso hay
 * defaults en espanol y la version traducida va en ErrorBoundaryWithTranslation.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.reintentar = this.reintentar.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // En desarrollo queda en la consola, que es donde se mira cuando algo se
    // rompe. En produccion se mandaria a un servicio de errores.
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', this.props.zona || '', error, info?.componentStack);
    }
    if (this.props.onError) this.props.onError(error, info);
  }

  reintentar() {
    this.setState({ error: null });
    if (this.props.onReset) this.props.onReset();
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const l = this.props.labels || {};
    const titulo = l.title || 'Algo se rompió en esta pantalla';
    const pista = l.hint
      || 'No se perdió nada de tu cuenta. Podés recargar la página o moverte a otra sección con el menú lateral.';

    return (
      <div className="error-boundary" role="alert">
        <div className="error-boundary-card">
          <span className="error-boundary-mark" aria-hidden="true">!</span>
          <h2>{titulo}</h2>
          <p>{pista}</p>

          {/* El mensaje real se muestra plegado: sirve para diagnosticar, pero
              de entrada distrae de lo que la persona intenta hacer. */}
          <details className="error-boundary-detail">
            <summary>{l.details || 'Ver detalle técnico'}</summary>
            <pre>{String(error && (error.stack || error.message) || error)}</pre>
          </details>

          <div className="error-boundary-actions">
            <button type="button" className="btn btn-primary" onClick={this.reintentar}>
              {l.retry || 'Reintentar'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => window.location.reload()}
            >
              {l.reload || 'Recargar la página'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

/** El limite con los textos del idioma activo. Va dentro de los providers. */
export function ErrorBoundaryWithTranslation({ zona, children }) {
  const { t } = useTranslation();
  return (
    <ErrorBoundary
      zona={zona}
      labels={{
        title: t('error.title'),
        hint: t('error.hint'),
        details: t('error.details'),
        retry: t('error.retry'),
        reload: t('error.reload'),
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
