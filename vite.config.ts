import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'FinTrack — Personal Finance Manager',
        short_name: 'FinTrack',
        description: 'Track expenses, lent & debt, and investments with AI-powered insights.',
        theme_color: '#0C0F0D',
        background_color: '#0C0F0D',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        categories: ['finance', 'productivity'],
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // Only the static app shell (JS/CSS/HTML/images) is precached for offline
      // load — deliberately no runtime caching of Supabase/Groq API calls, since
      // serving stale cached financial data as if it were current would be worse
      // than the existing ErrorBanner/retry UX for a real network failure.
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split the two heaviest, broadly-shared deps into their own vendor
        // chunks. framer-motion is imported by ~48 files, so without this it
        // gets pulled into the main shared chunk regardless of route-level
        // splitting; recharts is only used by AnalyticsPage but is large
        // enough (charting lib) to deserve its own cacheable chunk rather
        // than being inlined into that page's chunk. See TODO.md §4.1.
        manualChunks(id) {
          if (id.includes('/node_modules/recharts/')) return 'recharts'
          if (id.includes('/node_modules/framer-motion/')) return 'framer-motion'
        },
      },
    },
  },
})
