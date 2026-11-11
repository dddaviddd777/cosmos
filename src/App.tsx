import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { bodyById } from './astro/bodies';
import { BodyPage } from './pages/BodyPage';
import { Explore, INITIAL_EXPLORE, type ExploreState } from './pages/Explore';
import { initialMapState, MapPage, sceneIdFor, type MapState } from './pages/MapPage';
import { Tonight } from './pages/Tonight';
import { Understand } from './pages/Understand';
import { hrefFor, navigate, useNow, useRoute, type Tab } from './router';
import { HelpDialog } from './ui/HelpDialog';
import { MiniMap } from './ui/MiniMap';
import { useNightMode, useStoredFlag } from './ui/prefs';
import { Icon, type IconName } from './ui/Icon';

// «Troba'l al cel» només es baixa quan es fa servir
const SkyFinder = lazy(() => import('./ui/SkyFinder').then((m) => ({ default: m.SkyFinder })));

const TABS: { tab: Tab; href: string; icon: IconName; label: string }[] = [
  { tab: 'explora', href: hrefFor.explora, icon: 'list', label: 'Explora' },
  { tab: 'nit', href: hrefFor.nit, icon: 'sky', label: 'Aquesta nit' },
  { tab: 'entendre', href: hrefFor.entendre, icon: 'bulb', label: 'Entendre' },
  { tab: 'mapa', href: hrefFor.mapa, icon: 'orbit', label: 'Mapa' },
];

export default function App() {
  const route = useRoute();
  const now = useNow(1000);
  const [night, setNight] = useNightMode();
  const [welcomed, setWelcomed] = useStoredFlag('cosmos.welcomed', false);
  const [helpOpen, setHelpOpen] = useState(() => !welcomed);
  /** Cos que s'està buscant al cel (pantalla «Troba'l al cel») */
  const [finderId, setFinderId] = useState<string | null>(null);
  const [explore, setExplore] = useState<ExploreState>(INITIAL_EXPLORE);
  const listScroll = useRef(0);
  const [map, setMap] = useState<MapState>(initialMapState);
  // El mapa es munta el primer cop que s'obre i després es conserva (Three.js és car de crear)
  const [mapUsed, setMapUsed] = useState(route.tab === 'mapa');
  useEffect(() => {
    if (route.tab === 'mapa') setMapUsed(true);
  }, [route.tab]);

  const body = route.tab === 'explora' && route.id ? bodyById(route.id) : undefined;
  const onMap = route.tab === 'mapa';

  // Títol de la pestanya del navegador
  useEffect(() => {
    const t = body ? body.name : TABS.find((x) => x.tab === route.tab)!.label;
    document.title = `${t} · Cosmos`;
  }, [body, route.tab]);

  // «/» o Ctrl+K: ves a la cerca
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;
      if (document.querySelector('[aria-modal="true"]')) return;
      if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        navigate(hrefFor.explora);
        setTimeout(() => document.getElementById('cerca')?.focus(), 0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const showOnMap = (id: string) => {
    const s = sceneIdFor(id);
    setMap((m) => ({ ...m, selectedId: id, focus: { id: s, nonce: m.focus.nonce + 1 } }));
    navigate(hrefFor.mapa);
  };

  return (
    <div className={`shell shell--${route.tab}`}>
      <header className="appbar">
        <a className="appbar__title" href={hrefFor.explora}>Cosmos <span>· Sistema Solar</span></a>
        <nav className="tabs" aria-label="Seccions">
          {TABS.map((t) => (
            <a key={t.tab} href={t.href} className={route.tab === t.tab ? 'active' : ''} aria-current={route.tab === t.tab ? 'page' : undefined}>
              <Icon name={t.icon} /> {t.label}
            </a>
          ))}
        </nav>
        <div className="appbar__actions">
          <button
            className={`icon-btn ${night ? 'active' : ''}`}
            aria-pressed={night}
            onClick={() => setNight((n) => !n)}
            aria-label="Mode nocturn"
            title="Mode nocturn: pantalla vermella per no enlluernar-te quan mires el cel"
          >
            <Icon name="moon" />
          </button>
          <button className="icon-btn" onClick={() => setHelpOpen(true)} aria-label="Ajuda" title="Com funciona">?</button>
        </div>
      </header>

      <main className="main">
        {route.tab === 'explora' && (
          <div className={`explore-layout ${body ? 'explore-layout--detail' : ''}`}>
            <Explore state={explore} onChange={setExplore} now={now} selectedId={body?.id} onFind={setFinderId} scrollRef={listScroll} />
            {body ? (
              <BodyPage body={body} now={now} onFind={setFinderId} onShowOnMap={showOnMap} />
            ) : (
              <div className="pane explore-intro">
                <h1>El sistema solar, ara mateix</h1>
                <p>Tria un cos de la llista per saber on és en aquest moment, com és comparat amb la Terra i quant triga la seva llum a arribar-te.</p>
                <p className="muted">Amb el botó <Icon name="telescope" /> el mòbil et guia per trobar-lo al cel de veritat.</p>
                <figure className="explore-intro__map">
                  <MiniMap now={now} size={420} />
                  <figcaption className="muted small">
                    On són els planetes ara mateix, vistos des de dalt. Les distàncies estan comprimides: si no, Mercuri,
                    Venus, la Terra i Mart quedarien tots enganxats al Sol. Clica un planeta per obrir-ne la fitxa, o
                    explora el <a href={hrefFor.mapa}>mapa 3D</a> i viatja en el temps.
                  </figcaption>
                </figure>
              </div>
            )}
          </div>
        )}
        {route.tab === 'nit' && <Tonight now={now} onFind={setFinderId} />}
        {route.tab === 'entendre' && <Understand now={now} section={route.id} />}
        {mapUsed && (
          <div className="map-host" hidden={!onMap}>
            <MapPage state={map} setState={setMap} paused={!onMap || !!finderId} />
          </div>
        )}
      </main>

      <nav className="bottom-tabs" aria-label="Seccions">
        {TABS.map((t) => (
          <a key={t.tab} href={t.href} className={route.tab === t.tab ? 'active' : ''} aria-current={route.tab === t.tab ? 'page' : undefined}>
            <Icon name={t.icon} />
            {t.label}
          </a>
        ))}
      </nav>

      {finderId && bodyById(finderId) && (
        <Suspense fallback={<div className="finder finder--loading" role="status"><span className="spinner" aria-hidden="true" /> Preparant el cel…</div>}>
          <SkyFinder body={bodyById(finderId)!} onClose={() => setFinderId(null)} night={night} onNight={setNight} />
        </Suspense>
      )}

      {helpOpen && (
        <HelpDialog
          welcome={!welcomed}
          onClose={() => {
            setHelpOpen(false);
            setWelcomed(true);
          }}
        />
      )}

      {/* Mode nocturn: una capa vermella que multiplica tot el que hi ha a sota (també la càmera i el 3D) */}
      {night && <div className="night-filter" aria-hidden="true" />}
    </div>
  );
}
