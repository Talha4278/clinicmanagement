import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Appointments from './pages/Appointments';
import Invoices from './pages/Invoices';
import NewInvoice from './pages/NewInvoice';
import InvoiceView from './pages/InvoiceView';
import Reports from './pages/Reports';
import Staff from './pages/Staff';

type Page = 'dashboard' | 'patients' | 'appointments' | 'invoices' | 'new-invoice' | 'reports' | 'staff';

function AppContent() {
  const { user, staff, loading } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');

  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
  const [viewPatientId, setViewPatientId] = useState<string | null>(null);
  const [bookPatientId, setBookPatientId] = useState<string | null>(null);


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
          <p className="text-sm text-gray-400">Loading Dentivista...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  function navigate(p: string, extraId?: string) {
    setPage(p as Page);
    setViewInvoiceId(null);
    setViewPatientId(null);
    if (p === 'appointments' && extraId) {
      setBookPatientId(extraId);
    } else {
      setBookPatientId(null);
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
        return <Dashboard onNavigate={navigate} />;
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
            preselectedPatientId={bookPatientId}
            onNewInvoiceForPatient={(patientId) => navigate('new-invoice', patientId)}
          />
        );
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
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  }


  // Determine which sidebar item to highlight
  const layoutPage = viewInvoiceId ? 'invoices' : page;

  return (
    <Layout currentPage={layoutPage as Page} onNavigate={navigate}>
      {renderPage()}
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
