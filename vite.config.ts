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
        guide_charting: 'guides/digital-dental-charting-odontogram-emr/index.html',
        guide_pms: 'guides/cloud-dental-practice-management-software/index.html',
        blog_fdi: 'blog/fdi-vs-universal-tooth-numbering-system/index.html',
        blog_odontogram: 'blog/interactive-adult-pediatric-digital-odontogram/index.html',
        blog_dossier: 'blog/digital-dental-patient-dossier-emr/index.html',
        blog_rct_implant: 'blog/tracking-multi-visit-rct-implant-workflows/index.html',
        blog_paperless: 'blog/paper-to-digital-chairside-dental-charting/index.html',
        blog_soap: 'blog/dental-examination-soap-note-templates/index.html',
        blog_color_chart: 'blog/color-coded-odontogram-restorations-treatment-plan/index.html',
        blog_unbilled: 'blog/prevent-unbilled-unlinked-dental-procedures/index.html',
        blog_pak_uae: 'blog/dental-practice-management-software-pakistan-uae/index.html',
        blog_cloud_vs_desktop: 'blog/cloud-dental-software-vs-offline-desktop-pms/index.html',
        blog_whatsapp: 'blog/automated-whatsapp-dental-appointment-reminders/index.html',
        blog_billing_inventory: 'blog/dental-clinic-billing-inventory-expiry-software/index.html',
      },
    },
  },
});
