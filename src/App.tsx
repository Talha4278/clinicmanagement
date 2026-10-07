import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
  const [page, setPage] = useState<Page>('dashboard');
  const [authEntry] = useState<AuthEntryParams>(readAuthEntryParams);

  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
  const [viewPatientId, setViewPatientId] = useState<string | null>(null);
  const [patientContextId, setPatientContextId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--cream)' }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: '#3c5e27' }}
          >
            <svg className="w-5 h-5 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-sm text-gray-400">Loading Clinsyst...</p>
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
        return <Staff />;

      case 'setup':
        return <ClinicSetup />;

      default:
        return <Dashboard onNavigate={navigate} />;
    }
  }

  // Determine which sidebar item to highlight
  const layoutPage = viewInvoiceId ? 'invoices' : page;

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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
