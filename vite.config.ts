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
        guide_fdi: 'guides/fdi-vs-universal-tooth-numbering-system/index.html',
        guide_odontogram: 'guides/interactive-adult-pediatric-digital-odontogram/index.html',
        guide_dossier: 'guides/digital-dental-patient-dossier-emr/index.html',
        guide_rct_implant: 'guides/tracking-multi-visit-rct-implant-workflows/index.html',
        guide_paperless: 'guides/paper-to-digital-chairside-dental-charting/index.html',
        guide_soap: 'guides/dental-examination-soap-note-templates/index.html',
        guide_color_chart: 'guides/color-coded-odontogram-restorations-treatment-plan/index.html',
        guide_unbilled: 'guides/prevent-unbilled-unlinked-dental-procedures/index.html',
        guide_pak_uae: 'guides/dental-practice-management-software-pakistan-uae/index.html',
        guide_cloud_vs_desktop: 'guides/cloud-dental-software-vs-offline-desktop-pms/index.html',
        guide_whatsapp: 'guides/automated-whatsapp-dental-appointment-reminders/index.html',
        guide_billing_inventory: 'guides/dental-clinic-billing-inventory-expiry-software/index.html',
        guide_cloud_emr: 'guides/cloud-based-dental-emr-system/index.html',
        guide_appointment_system: 'guides/dental-clinic-appointment-scheduling-system/index.html',
      },
    },
  },
});
