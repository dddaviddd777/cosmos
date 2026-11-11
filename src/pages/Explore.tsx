import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { CATALOG, bodyById, KIND_LABELS, wikipediaUrl, type BodyInfo, type BodyKind } from '../astro/bodies';
import { formatKm, formatLightTime, formatLy } from '../astro/format';
import { liveDistance } from '../astro/live';
import { diameterKm, formatDiameter, meanSunDistanceAu, taglineOf } from '../astro/profile';
import { hrefFor } from '../router';
import { searchBodies } from '../search/search';
import { MiniMap } from '../ui/MiniMap';
import { Term } from '../ui/Term';
import { Icon } from '../ui/Icon';

export type SortKey = 'sol' | 'terra' | 'mida' | 'nom';
export type KindFilter = 'tots' | Exclude<BodyKind, 'estrella'>;

export interface ExploreState {
  query: string;
  kind: KindFilter;
  sort: SortKey;
}

export const INITIAL_EXPLORE: ExploreState = { query: '', kind: 'tots', sort: 'sol' };

const SORT_LABELS: Record<SortKey, string> = {
  sol: 'Distància al Sol',
  terra: 'Distància a la Terra, ara',
  mida: 'Mida',
  nom: 'Nom (A–Z)',
};

const FILTERS: KindFilter[] = ['tots', 'planeta', 'planeta nan', 'satèl·lit', 'asteroide', 'cometa', 'estel', 'cel profund'];
/** Ordre dels grups quan es mostra tot per distància al Sol */
const GROUP_ORDER: BodyKind[] = ['estrella', 'planeta', 'planeta nan', 'asteroide', 'cometa', 'satèl·lit', 'estel', 'cel profund'];

interface Props {
  state: ExploreState;
  onChange: (s: ExploreState) => void;
  now: Date;
  selectedId?: string;
  onFind: (id: string) => void;
  /** Posició de desplaçament guardada (per tornar al mateix lloc en sortir d'una fitxa) */
  scrollRef: React.MutableRefObject<number>;
}

const n1 = (v: number) => v.toLocaleString('ca', { maximumFractionDigits: v < 10 ? 2 : 1 });

export function Explore({ state, onChange, now, selectedId, onFind, scrollRef }: Props) {
  const { query, kind, sort } = state;
  const set = (patch: Partial<ExploreState>) => onChange({ ...state, ...patch });

  // Distàncies a la Terra: només cal recalcular-les quan es mostren (ordre «Terra»)
  const minute = Math.floor(now.getTime() / 60_000);
  const earthDist = useMemo(() => {
    const m = new Map<string, ReturnType<typeof liveDistance>>();
    if (sort === 'terra') for (const b of CATALOG) if (b.id !== 'earth') m.set(b.id, liveDistance(b, new Date(minute * 60_000)));
    return m;
  }, [sort, minute]);

  const groups = useMemo(() => {
    const kinds = kind === 'tots' ? undefined : new Set<BodyKind>([kind]);
    if (query.trim()) return [{ title: null as string | null, beyond: false, items: searchBodies(query, kinds) }];

    let items = CATALOG.filter((b) => !kinds || kinds.has(b.kind));
    const by: Record<SortKey, (a: BodyInfo, b: BodyInfo) => number> = {
      // Les llunes tenen la distància del seu planeta: dins de cada planeta, de més gran a més petita
      sol: (a, b) => meanSunDistanceAu(a) - meanSunDistanceAu(b) || diameterKm(b) - diameterKm(a),
      terra: (a, b) => (a.id === 'earth' ? -1 : b.id === 'earth' ? 1 : (earthDist.get(a.id)?.km ?? Infinity) - (earthDist.get(b.id)?.km ?? Infinity)),
      mida: (a, b) => diameterKm(b) - diameterKm(a),
      nom: (a, b) => a.name.localeCompare(b.name, 'ca'),
    };
    items = [...items].sort(by[sort]);
    if (sort === 'sol' && kind === 'tots') {
      return GROUP_ORDER.map((k) => ({
        title: k === 'estrella' ? null : KIND_LABELS[k],
        // Abans del primer grup de fora del sistema solar, un títol que ho separi
        beyond: k === 'estel',
        items: items.filter((b) => b.kind === k),
      }));
    }
    return [{ title: null, beyond: false, items }];
  }, [query, kind, sort, earthDist]);

  const total = groups.reduce((s, g) => s + g.items.length, 0);

  // Torna a la posició on era la llista
  const list = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (list.current) list.current.scrollTop = scrollRef.current;
  }, [scrollRef]);
  // Si se selecciona un cos des d'una altra banda (p. ex. el mapa), que sigui visible a la llista
  useEffect(() => {
    if (selectedId) list.current?.querySelector(`[data-id="${CSS.escape(selectedId)}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  const meta = (b: BodyInfo): React.ReactNode => {
    const parent = b.parent ? bodyById(b.parent) : undefined;
    if (sort === 'terra') {
      if (b.id === 'earth') return 'Ets aquí';
      const d = earthDist.get(b.id);
      return d ? <>{d.approx ? '≈ ' : ''}{formatKm(d.km)} · la <Term id="llum">llum</Term> triga {formatLightTime(d.lightMinutes)}</> : '';
    }
    if (sort === 'mida') return `${formatDiameter(diameterKm(b))} de diàmetre`;
    if (b.sky) return `${formatLy(b.sky.ly)} · constel·lació ${b.sky.constellation}`;
    if (parent) return `Lluna de ${parent.name}`;
    if (b.id === 'sun') return 'Al centre';
    return <>{n1(meanSunDistanceAu(b))} <Term id="ua">UA</Term> del Sol, de mitjana</>;
  };

  return (
    <div className="explore pane" ref={list} onScroll={(e) => (scrollRef.current = e.currentTarget.scrollTop)}>
      <div className="explore__tools">
        <input
          id="cerca"
          type="search"
          placeholder="Cerca: Saturn, Halley, Europa…"
          value={query}
          onChange={(e) => set({ query: e.target.value })}
          aria-label="Cerca un cos"
        />
        <div className="chips" role="group" aria-label="Filtra per tipus">
          {FILTERS.map((k) => (
            <button key={k} className={kind === k ? 'active' : ''} aria-pressed={kind === k} onClick={() => set({ kind: k })}>
              {k === 'tots' ? 'Tots' : KIND_LABELS[k]}
            </button>
          ))}
        </div>
        {!query.trim() && (
          <label className="explore__sort">
            <span className="muted">Ordena per</span>
            <select value={sort} onChange={(e) => set({ sort: e.target.value as SortKey })}>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <option key={k} value={k}>{SORT_LABELS[k]}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {!query.trim() && kind === 'tots' && (
        <details className="explore__minimap" open>
          <summary><Icon name="orbit" /> On són ara els planetes</summary>
          <MiniMap now={now} size={280} />
          <p className="muted small">
            Vist des de dalt, amb les distàncies comprimides. Toca un planeta per veure’n la fitxa, o obre el{' '}
            <a href={hrefFor.mapa}>mapa 3D</a>.
          </p>
        </details>
      )}

      {total === 0 && <p className="muted explore__empty">Cap resultat. Prova amb un altre nom.</p>}

      {groups.map((g, gi) =>
        g.items.length === 0 ? null : (
          <section key={g.title ?? gi} aria-label={g.title ?? undefined}>
            {g.beyond && (
              <div className="explore__beyond">
                <h2>Més enllà del sistema solar</h2>
                <p className="muted small">
                  Estrelles i galàxies que pots veure sense telescopi. Són tan lluny que les distàncies es compten en{' '}
                  <Term id="any-llum">anys llum</Term>: la seva llum va sortir fa anys, segles o milions d’anys.
                </p>
              </div>
            )}
            {g.title && <h2 className="explore__group">{g.title} <span className="muted">{g.items.length}</span></h2>}
            <ul className="body-list">
              {g.items.map((b) => (
                <li key={b.id} data-id={b.id} className={`body-row ${selectedId === b.id ? 'body-row--selected' : ''}`}>
                  <span className="body-row__dot" style={{ background: b.color }} aria-hidden="true" />
                  <div className="body-row__main">
                    <a className="body-row__link" href={hrefFor.body(b.id)} aria-current={selectedId === b.id ? 'page' : undefined}>
                      {b.name}
                    </a>
                    <p className="body-row__tag">{taglineOf(b)}</p>
                    <p className="body-row__meta muted">{meta(b)}</p>
                  </div>
                  <div className="body-row__actions">
                    {b.id !== 'earth' && (
                      <button onClick={() => onFind(b.id)} aria-label={`Troba ${b.name} al cel`} title="Troba’l al cel">
                        <Icon name="telescope" /><span> Troba’l</span>
                      </button>
                    )}
                    <a href={wikipediaUrl(b)} target="_blank" rel="noopener noreferrer" aria-label={`${b.name} a la Viquipèdia (s’obre en una pestanya nova)`} title="Viquipèdia">
                      W<span> Viquipèdia</span><Icon name="external" />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ),
      )}
    </div>
  );
}
