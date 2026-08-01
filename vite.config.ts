import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Local dev: API calls go to `wrangler dev` running on 8787
      '/api': 'http://127.0.0.1:8787',
    },
  },
});
