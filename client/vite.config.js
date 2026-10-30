import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server forwards API and image requests to the Express server, so the
// browser only ever talks to one address and no ports are hard-coded in the app.
const apiTarget = process.env.API_TARGET || 'http://localhost:5050';
const proxy = { '/api': apiTarget, '/uploads': apiTarget };

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy
  },
  preview: { proxy },
  test: {
    environment: 'node'
  }
});
