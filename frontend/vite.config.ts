import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const portalApi = 'http://localhost:3001';
const investmentApi = 'http://localhost:3000';

export default defineConfig({
  // VPS under portal: VITE_BASE=/Investment/ npm run build
  base: process.env.VITE_BASE || '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api/auth': { target: portalApi, changeOrigin: true },
      '/api/admin': { target: portalApi, changeOrigin: true },
      '/api': { target: investmentApi, changeOrigin: true },
    },
  },
});
