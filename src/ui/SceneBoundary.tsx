import { Component, type ReactNode } from 'react';

/** Comprova si el navegador pot dibuixar en 3D (WebGL). */
export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function SceneFallback({ error }: { error?: boolean }) {
  return (
    <div className="scene-fallback" role="status">
      {error ? (
        <>
          <p><strong>No es pot mostrar l’esquema 3D en aquest navegador.</strong></p>
          <p className="muted">
            Prova d’actualitzar el navegador o d’activar l’acceleració per maquinari. Mentrestant, pots fer servir
            el cercador, les fitxes, les distàncies i «Troba’l al cel».
          </p>
        </>
      ) : (
        <p className="muted"><span className="spinner" aria-hidden="true" /> Carregant l’esquema 3D…</p>
      )}
    </div>
  );
}

/** Si l'escena 3D falla (sense WebGL, GPU perduda…), la resta de l'app continua funcionant. */
export class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: !hasWebGL() };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <SceneFallback error /> : this.props.children;
  }
}
