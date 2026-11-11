import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';

// base relativa: permet publicar l'app en qualsevol subcarpeta (GitHub Pages, etc.)
// `npm run dev:https` activa un certificat de prova: el mòbil només deixa usar càmera i brúixola amb https.
export default defineConfig(({ mode }) => ({
  base: './',
  build: {
    // Three.js és una sola biblioteca de ~740 kB que no es pot dividir més; es carrega en segon pla
    chunkSizeWarningLimit: 800,
    // Biblioteques en fitxers a part: canvien poc i el navegador les pot reaprofitar entre versions
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\\/]three[\\/]/, priority: 30 },
            { name: 'r3f', test: /node_modules[\\/](@react-three|three-stdlib|troika-|@monogrid|camera-controls|maath|meshline|stats-gl|suspend-react|its-fine|zustand|tunnel-rat)/, priority: 20 },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 40 },
            { name: 'astronomy', test: /node_modules[\\/]astronomy-engine[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
  plugins: [
    react(),
    ...(mode === 'https' ? [basicSsl()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Cosmos – Sistema Solar',
        short_name: 'Cosmos',
        description: 'Els planetes, les estrelles i les galàxies que pots veure, on són ara mateix i com trobar-los al cel.',
        id: './',
        categories: ['education', 'science'],
        lang: 'ca',
        theme_color: '#05070f',
        background_color: '#05070f',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,json,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Resums i imatges de la Viquipèdia: es mostren al moment des de la memòria cau
        // i s'actualitzen en segon pla; així les fitxes ja vistes funcionen fora de línia.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(ca|en)\.wikipedia\.org\/api\/rest_v1\/page\/summary\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'wiki-summaries', expiration: { maxEntries: 200, maxAgeSeconds: 30 * 86_400 } },
          },
          {
            urlPattern: /^https:\/\/(upload|thumb)\.wikimedia\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wiki-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 90 * 86_400 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
}));
