import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/images': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
    },
  },
  build: {
    // Daha küçük initial bundle => LCP/FCP iyileşir.
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@mui') || id.includes('@emotion')) return 'mui';
          if (id.includes('react-leaflet') || id.includes('leaflet')) return 'leaflet';
          if (id.includes('react-router')) return 'router';
          if (id.includes('@react-oauth') || id.includes('axios')) return 'auth';
          if (id.includes('react-hot-toast') || id.includes('react-icons')) return 'ui';
          if (id.includes('react-dom') || id.includes('scheduler') || id.includes('/react/')) return 'react';
          return 'vendor';
        },
      },
    },
  },
})
