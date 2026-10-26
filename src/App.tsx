import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import LoginPage from './pages/LoginPage';
import Layout, { Page } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Appointments from './pages/Appointments';
import Examinations from './pages/Examinations';
import Treatments from './pages/Treatments';
import Prescriptions from './pages/Prescriptions';
import Inventory from './pages/Inventory';
import Invoices from './pages/Invoices';
import NewInvoice from './pages/NewInvoice';
import InvoiceView from './pages/InvoiceView';
import Reports from './pages/Reports';
import Staff from './pages/Staff';
import ClinicSetup from './pages/ClinicSetup';
import PatientDossierModal from './components/PatientDossierModal';
import SuspendedClinicScreen from './components/SuspendedClinicScreen';
import { SubscriptionPlan } from './lib/types';

/** Static marketing landing page (root index.html). The React app lives at /app/. */
const LANDING_URL = '/';

interface AuthEntryParams {
  mode: 'signin' | 'signup';
  plan: SubscriptionPlan;
  billing: 'monthly' | 'annual';
}

/**
 * Reads ?mode=signin|signup&plan=starter|pro|enterprise&billing=monthly|annual
 * set by the landing page "Sign In" / "Start 14-Day Free Trial" buttons.
 */
function readAuthEntryParams(): AuthEntryParams {
  const params = new URLSearchParams(window.location.search);
  const plan = params.get('plan');
  return {
    mode: params.get('mode') === 'signup' ? 'signup' : 'signin',
    plan: plan === 'starter' || plan === 'pro' || plan === 'enterprise' ? plan : 'pro',
    billing: params.get('billing') === 'monthly' ? 'monthly' : 'annual',
  };
}

function AppContent() {
  const { user, staff, activeClinic, refreshClinicStatus, signOut, loading } = useAuth();
  const { theme, themeConfig } = useTheme();
  const [page, setPage] = useState<Page>('dashboard');
  const [authEntry] = useState<AuthEntryParams>(readAuthEntryParams);

  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
  const [viewPatientId, setViewPatientId] = useState<string | null>(null);
  const [patientContextId, setPatientContextId] = useState<string | null>(null);
  const [slowLoadingNotice, setSlowLoadingNotice] = useState(false);

  // Safety escape hatch: if loading takes longer than 2.5s, give the user an instant one-click reset
  useEffect(() => {
    if (!loading) {
      setSlowLoadingNotice(false);
      return;
    }
    const timer = setTimeout(() => {
      setSlowLoadingNotice(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 transition-colors duration-300"
        style={{ background: themeConfig.appBg }}
      >
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          {/* Dual-ring Spinner paired with Logo Badge matching Landing Page */}
          <div className="relative w-16 h-16 flex items-center justify-center">
            {/* Outer Subtle Background Track */}
            <div
              className="absolute inset-0 rounded-full border-3 transition-colors duration-300"
              style={{
                borderColor: theme === 'blue' ? '#e0f2fe' : '#e1edd9',
              }}
            />
            {/* Spinning Arc with Brand Primary Color */}
            <div
              className="absolute inset-0 rounded-full border-3 border-transparent animate-spin transition-colors duration-300"
              style={{
                borderTopColor: themeConfig.primary,
                borderRightColor: theme === 'blue' ? 'rgba(2, 132, 199, 0.4)' : 'rgba(60, 94, 39, 0.4)',
              }}
            />
            {/* Center Brand Badge (matches Landing Page header logo exactly) */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md transition-all duration-300"
              style={{
                background: themeConfig.primary,
                boxShadow:
                  theme === 'blue'
                    ? '0 8px 20px -4px rgba(2, 132, 199, 0.4)'
                    : '0 8px 20px -4px rgba(60, 94, 39, 0.4)',
              }}
            >
              C
            </div>
          </div>

          <div>
            <p
              className="text-sm font-bold tracking-tight"
              style={{ color: theme === 'blue' ? '#0c4a6e' : '#2a401d' }}
            >
              Loading Clinsyst...
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: themeConfig.primary }}
              />
              <p className="text-[11px] font-medium text-slate-400">
                {themeConfig.name}
              </p>
            </div>
          </div>
          {slowLoadingNotice && (
            <div className="mt-2 flex flex-col items-center gap-2">
              <p className="text-xs text-slate-400">Taking longer than expected to connect?</p>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem('dentivista_demo_role');
                    localStorage.removeItem('clinsyst_active_staff_session');
                    Object.keys(localStorage).forEach((k) => {
                      if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
                        localStorage.removeItem(k);
                      }
                    });
                  } catch {}
                  window.location.href = '/app/?mode=signin';
                }}
                className="text-xs text-sky-600 hover:text-sky-700 underline font-semibold cursor-pointer"
              >
                Click here to reset cache and proceed to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage
        initialMode={authEntry.mode}
        initialPlan={authEntry.plan}
        initialBilling={authEntry.billing}
        onBackToLanding={() => { window.location.href = LANDING_URL; }}
      />
    );
  }

  // Clinic access guard: enforce suspended status and expired trials
  const isTrialExpired =
    activeClinic?.status === 'trial' &&
    Boolean(activeClinic.trial_ends_at && new Date() > new Date(activeClinic.trial_ends_at));

  if (activeClinic && (activeClinic.status === 'suspended' || isTrialExpired)) {
    return (
      <SuspendedClinicScreen
        clinic={activeClinic}
        isTrialExpired={isTrialExpired}
        onRefreshStatus={refreshClinicStatus}
        onSignOut={signOut}
      />
    );
  }

  function navigate(p: string, extraId?: string) {
    setPage(p as Page);
    setViewInvoiceId(null);
    if (extraId) {
      setPatientContextId(extraId);
    } else {
      setPatientContextId(null);
    }
  }

  function renderPage() {
    // Invoice view (sub-page of invoices)
    if (page === 'invoices' && viewInvoiceId) {
      return (
        <InvoiceView
          invoiceId={viewInvoiceId}
          onBack={() => setViewInvoiceId(null)}
        />
      );
    }

    switch (page) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigate={navigate}
            onViewPatientDossier={(patientId) => setViewPatientId(patientId)}
          />
        );

      case 'patients':
        return (
          <Patients
            onViewPatient={(id) => setViewPatientId(id)}
            onBookAppointment={(patientId) => navigate('appointments', patientId)}
          />
        );

      case 'appointments':
        return (
          <Appointments
            preselectedPatientId={patientContextId}
            onNewInvoiceForPatient={(patientId) => navigate('new-invoice', patientId)}
          />
        );

      case 'examinations':
        return (
          <Examinations
            preselectedPatientId={patientContextId}
            onNavigateToTreatment={(pid, _toothNum, _proc) => {
              navigate('treatments', pid);
            }}
            onViewPatientDossier={(pid) => setViewPatientId(pid)}
          />
        );

      case 'treatments':
        return (
          <Treatments
            preselectedPatientId={patientContextId}
            onNewInvoice={(patientId) => navigate('new-invoice', patientId)}
            onViewPatientDossier={(pid) => setViewPatientId(pid)}
          />
        );

      case 'prescriptions':
        return (
          <Prescriptions
            preselectedPatientId={patientContextId}
            onViewPatientDossier={(pid) => setViewPatientId(pid)}
          />
        );

      case 'inventory':
        return <Inventory />;

      case 'invoices':
        return (
          <Invoices
            onNewInvoice={() => navigate('new-invoice')}
            onViewInvoice={(id) => { setViewInvoiceId(id); }}
          />
        );

      case 'new-invoice':
        return (
          <NewInvoice
            onSuccess={(id) => {
              setPage('invoices');
              setViewInvoiceId(id);
            }}
          />
        );

      case 'reports':
        if (staff?.role === 'receptionist') {
          return <Dashboard onNavigate={navigate} />;
        }
        return <Reports />;

      case 'staff':
        return <ClinicSetup initialTab="staff_services" />;

      case 'setup':
        return <ClinicSetup />;

      default:
        return <Dashboard onNavigate={navigate} />;
    }
  }

  // Determine which sidebar item to highlight
  const layoutPage = viewInvoiceId ? 'invoices' : (page === 'staff' ? 'setup' : page);

  return (
    <Layout
      currentPage={layoutPage}
      onNavigate={navigate}
    >
      {renderPage()}

      {/* Patient Dossier Modal (All related records & research timeline) */}
      {viewPatientId && (
        <PatientDossierModal
          patientId={viewPatientId}
          onClose={() => setViewPatientId(null)}
          onNavigatePage={(p, extra) => {
            setViewPatientId(null);
            navigate(p, extra);
          }}
          onViewInvoice={(invId) => {
            setViewPatientId(null);
            setPage('invoices');
            setViewInvoiceId(invId);
          }}
        />
      )}
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
