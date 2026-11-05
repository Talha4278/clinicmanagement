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
        privacy: 'privacy/index.html',
        terms: 'terms/index.html',
        pillar1: 'guides/digital-dental-charting-odontogram-emr/index.html',
        cluster1_1: 'blog/fdi-vs-universal-tooth-numbering-system/index.html',
        cluster1_2: 'blog/interactive-adult-pediatric-digital-odontogram/index.html',
        cluster1_3: 'blog/digital-dental-patient-dossier-emr/index.html',
        cluster1_4: 'blog/tracking-multi-visit-rct-implant-workflows/index.html',
        cluster1_5: 'blog/paper-to-digital-chairside-dental-charting/index.html',
        cluster1_6: 'blog/dental-examination-soap-note-templates/index.html',
        cluster1_7: 'blog/color-coded-odontogram-restorations-treatment-plan/index.html',
        cluster1_8: 'blog/prevent-unbilled-unlinked-dental-procedures/index.html',
      },
    },
  },
});
