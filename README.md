# Cosmos – Sistema Solar

Aplicació web (PWA) per explorar el sistema solar en 3D amb les posicions reals dels planetes.
Funciona al navegador de l'ordinador i del mòbil, i es pot instal·lar com a app.

## Ordres

```bash
npm install      # instal·la dependències
npm run dev      # servidor de desenvolupament (http://localhost:5173, també accessible des del mòbil a la mateixa xarxa)
npm run dev:https  # igual però amb https (certificat de prova): cal per provar la càmera i la brúixola des del mòbil
npm test         # tests del motor astronòmic
npm run build    # versió de producció a dist/ (es pot publicar a qualsevol hosting estàtic amb HTTPS)
```

## Dades de cossos petits

Les òrbites d'asteroides, cometes i planetes nans (excepte Plutó) vénen de **NASA/JPL** i es desen a
`src/data/small-bodies.json`. Per actualitzar-les (p. ex. un cop l'any):

```bash
node scripts/fetch-small-bodies.mjs
npm test   # valida el propagador contra les posicions de JPL Horizons
```

## Estructura

- `src/astro/` — motor astronòmic (posicions, distàncies, cel local) basat en `astronomy-engine`, amb tests de validació.
- `src/scene/` — escena 3D (Three.js / React Three Fiber) i escales (didàctica i real).
- `src/search/` — cerca de cossos i resums de la Viquipèdia.
- `src/sky/` — «Troba'l al cel»: posició al cel local, orientació del mòbil, càmera i ubicació.
- `src/pages/` — pantalles: Explora (llista), fitxa de cada cos, Mapa (3D i viatge en el temps).
- `src/ui/` — cercador, fitxa de cada cos, panell de distàncies, controls de temps, ajuda i preferències (mode nocturn).

## Estat

- [x] Fase 0 — Base del projecte, PWA
- [x] Fase 1 — Motor astronòmic validat
- [~] Fase 2 — Vista 3D (versió mínima: Sol, planetes, Plutó, Lluna, òrbites, selecció)
- [~] Fase 3 — Màquina del temps (play/pausa/enrere, velocitats, anar a una data)
- [x] Fase 4 — Cercador (tolerant a faltes, filtres, «/» o Ctrl+K) i fitxes amb resum de la Viquipèdia; 37 cossos
- [x] Fase 5 — «Troba'l al cel»: càmera + ubicació + brúixola amb fletxes i calibratge; mapa del cel a l'ordinador
- [x] Fase 6 — Asteroides, cometes i planetes nans amb òrbites de NASA/JPL (45 cossos al catàleg)
- [x] Fase 7 — Poliment: càrrega inicial 3 vegades més lleugera (3D i «Troba'l al cel» es carreguen a part), benvinguda i ajuda, mode nocturn vermell, teclat i lectors de pantalla (Esc, Tab, files de la taula), «reduir moviment», avís si no hi ha WebGL, Apophis visible el 2029
## Redisseny (contingut primer)

- [x] R1 — Pestanyes (Explora · Aquesta nit · Entendre · Mapa), llista de tots els cossos amb frase curta, Troba'l i Viquipèdia; fitxa amb adreça pròpia (`#/cos/mart`), «la llum va sortir fa…» i comparacions amb la Terra; el 3D passa a la pestanya Mapa i només es carrega en obrir-la
- [x] R2 — Entendre: la llum ve del passat, què és una UA, mides, glossari clicable
- [x] R3 — Aquesta nit: què es veu ara des d'on ets
- [x] R4 — Mapa 2D petit a l'inici i a les fitxes
- [x] R5 — Més enllà del sistema solar: 16 estrelles brillants i 10 galàxies, cúmuls i nebuloses visibles sense telescopi (fitxa amb anys llum, com trobar-les, «Aquesta nit» i «Troba'l al cel»)

- [ ] Fase 8 (opcional) — Empaquetar com a app de botiga amb Capacitor
