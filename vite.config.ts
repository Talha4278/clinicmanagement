import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      // Multi-page build:
      //   /        -> index.html      (static marketing landing page)
      //   /app/    -> app/index.html  (React clinic app: sign in, trial signup, dashboard)
      input: {
        main: 'index.html',
        app: 'app/index.html',
      },
    },
  },
});
