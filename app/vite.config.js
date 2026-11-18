import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'NurseLog',
        short_name: 'NurseLog',
        description: 'Nursing clinical records and educational study tools',
        theme_color: '#0f172a',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
      },
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [
          { urlPattern: /^https?:\/\/.*\/api\/.*/, handler: 'NetworkOnly' },
          { urlPattern: /^https?:\/\/.*\/.*\.(js|css|png|svg|woff2?)$/, handler: 'StaleWhileRevalidate' },
        ],
      },
    }),
  ]
  ,
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
  },
});
