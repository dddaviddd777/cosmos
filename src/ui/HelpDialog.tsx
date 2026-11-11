import { useDialog } from './useDialog';
import { Icon } from './Icon';

interface Props {
  /** Primera visita: missatge de benvinguda en lloc d'«Ajuda» */
  welcome: boolean;
  onClose: () => void;
}

/** Ajuda i crèdits: com es fa servir l'app i d'on surten les dades. */
export function HelpDialog({ welcome, onClose }: Props) {
  const ref = useDialog<HTMLDivElement>(onClose);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={ref}
        className="modal help"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__head">
          <h2 id="help-title">{welcome ? 'Et donem la benvinguda al sistema solar!' : 'Com funciona'}</h2>
          <button onClick={onClose} aria-label="Tanca"><Icon name="close" /></button>
        </header>

        <p>
          Aquí veus el Sol i els planetes <strong>on són de veritat ara mateix</strong>, calculats amb les mateixes
          fórmules que fan servir els observatoris.
        </p>

        <ul className="help__list">
          <li><span><Icon name="list" /></span><div><strong>Explora</strong> tots els cossos en una llista: planetes, planetes nans, llunes, asteroides, cometes, i també estrelles i galàxies que es veuen sense telescopi. Pots cercar-los, filtrar-los i ordenar-los.</div></li>
          <li><span><Icon name="eye" /></span><div><strong>Toca’n un</strong> per veure’n la fitxa: on és ara mateix, quant tarda la seva llum a arribar-te, com és comparat amb la Terra i un resum de la Viquipèdia.</div></li>
          <li><span><Icon name="telescope" /></span><div><strong>Troba’l al cel:</strong> el mòbil et guia amb la càmera fins al cos al cel real.</div></li>
          <li><span><Icon name="orbit" /></span><div><strong>Mapa:</strong> el sistema solar en 3D, on pots viatjar endavant i enrere en el temps.</div></li>
          <li><span><Icon name="moon" /></span><div><strong>Mode nocturn:</strong> si ets a fora mirant estrelles, posa la pantalla en vermell per no enlluernar-te.</div></li>
        </ul>

        <details className="help__more">
          <summary>Per què els planetes semblen tan a prop i tan grossos?</summary>
          <p>
            Si es dibuixés tot a escala, els planetes serien punts invisibles: la Terra és 100 vegades més petita que el
            Sol i 12.000 vegades més petita que la distància que els separa. Per això les mides estan molt exagerades.
          </p>
          <p>
            L’<strong>escala didàctica</strong> també comprimeix les distàncies perquè hi càpiguen tots els planetes.
            Amb <strong>Distàncies reals</strong> veuràs les proporcions de debò: els planetes interiors s’amunteguen
            a prop del Sol i Neptú queda lluny, lluny.
          </p>
        </details>

        <details className="help__more">
          <summary>D’on surten les dades?</summary>
          <ul>
            <li>Posicions del Sol, la Lluna i els planetes: <a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noopener noreferrer">Astronomy Engine</a>, amb una precisió d’uns segons d’arc.</li>
            <li>Òrbites d’asteroides, cometes i planetes nans: <a href="https://ssd.jpl.nasa.gov/horizons/" target="_blank" rel="noopener noreferrer">NASA/JPL Horizons</a> i la base de dades de cossos petits del JPL.</li>
            <li>Textos i imatges de les fitxes: <a href="https://ca.wikipedia.org/" target="_blank" rel="noopener noreferrer">Viquipèdia</a>, sota llicència CC BY-SA.</li>
          </ul>
          <p className="muted">La ubicació i la càmera només es fan servir dins del teu dispositiu: no s’envien enlloc.</p>
        </details>

        <div className="modal__actions">
          <button className="primary" onClick={onClose} data-autofocus>{welcome ? 'Comença a explorar' : 'Entesos'}</button>
        </div>
      </div>
    </div>
  );
}
