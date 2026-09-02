import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'icon-512-maskable.png'],
      manifest: {
        name: 'Minha Carteira — Gestão Financeira',
        short_name: 'Minha Carteira',
        description: 'Caixa do Dia, Fiados, Stock, Xitique e Poupança num só lugar. Funciona 100% offline.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#F3F4F6',
        theme_color: '#F3F4F6',
        orientation: 'portrait',
        lang: 'pt-MZ',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cache-first para tudo: o app tem que abrir e funcionar por completo sem rede,
        // tal como o original (dados ficam sempre no localStorage do telemóvel).
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Fontes do Google Fonts: cache-first para continuarem a carregar offline
            // depois da primeira visita.
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        navigateFallback: '/index.html',
      },
    }),
  ],
})
