import { Navigate } from 'react-router-dom';
import InvestorsPage from '../pages/investors/InvestorsPage.jsx';
import InvestorDetailsPage from '../pages/investors/InvestorDetailsPage.jsx';
import InvestorKYCPage from '../pages/investors/InvestorKYCPage.jsx';
import InvestorProfilePage from '../pages/investors/InvestorProfilePage.jsx';
import UsersPage from '../pages/users/UsersPage.jsx';
import UserDetailsPage from '../pages/users/UserDetailsPage.jsx';
import UserApplicationPage from '../pages/users/UserApplicationPage.jsx';
import UserInstallationPage from '../pages/users/UserInstallationPage.jsx';
import PaymentsPage from '../pages/payments/PaymentsPage.jsx';
import PaymentDetailsPage from '../pages/payments/PaymentDetailsPage.jsx';
import TransactionLedgerPage from '../pages/payments/TransactionLedgerPage.jsx';
import PayoutConfirmationPage from '../pages/payments/PayoutConfirmationPage.jsx';
import CRMPage from '../pages/crm/CRMPage.jsx';
import TicketListPage from '../pages/crm/TicketListPage.jsx';
import TicketDetailsPage from '../pages/crm/TicketDetailsPage.jsx';
import CommunicationHistoryPage from '../pages/crm/CommunicationHistoryPage.jsx';
import ReportsPage from '../pages/reports/ReportsPage.jsx';
import ReportGeneratorPage from '../pages/reports/ReportGeneratorPage.jsx';
import AnalyticsPage from '../pages/reports/AnalyticsPage.jsx';

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    return <Navigate to="/auth/login" replace />;
  }
  return children;
};

// Admin route wrapper
const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('authToken');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (!token) {
    return <Navigate to="/auth/login" replace />;
  }
  
  if (user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Finance route wrapper
const FinanceRoute = ({ children }) => {
  const token = localStorage.getItem('authToken');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (!token) {
    return <Navigate to="/auth/login" replace />;
  }
  
  if (!['admin', 'finance'].includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Support route wrapper
const SupportRoute = ({ children }) => {
  const token = localStorage.getItem('authToken');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (!token) {
    return <Navigate to="/auth/login" replace />;
  }
  
  if (!['admin', 'support'].includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Management route wrapper
const ManagementRoute = ({ children }) => {
  const token = localStorage.getItem('authToken');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (!token) {
    return <Navigate to="/auth/login" replace />;
  }
  
  if (!['admin', 'manager'].includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Define routes array
export const routes = [
  // Investor routes
  {
    path: '/investors',
    element: (
      <ProtectedRoute>
        <InvestorsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/investors/:id',
    element: (
      <ProtectedRoute>
        <InvestorDetailsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/investors/:id/kyc',
    element: (
      <ProtectedRoute>
        <InvestorKYCPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/investors/:id/profile',
    element: (
      <ProtectedRoute>
        <InvestorProfilePage />
      </ProtectedRoute>
    ),
  },

  // User routes
  {
    path: '/users',
    element: (
      <ProtectedRoute>
        <UsersPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/users/:id',
    element: (
      <ProtectedRoute>
        <UserDetailsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/users/:id/application',
    element: (
      <ProtectedRoute>
        <UserApplicationPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/users/:id/installation',
    element: (
      <ProtectedRoute>
        <UserInstallationPage />
      </ProtectedRoute>
    ),
  },

  // Payment routes
  {
    path: '/payments',
    element: (
      <FinanceRoute>
        <PaymentsPage />
      </FinanceRoute>
    ),
  },
  {
    path: '/payments/:id',
    element: (
      <FinanceRoute>
        <PaymentDetailsPage />
      </FinanceRoute>
    ),
  },
  {
    path: '/payments/ledger',
    element: (
      <FinanceRoute>
        <TransactionLedgerPage />
      </FinanceRoute>
    ),
  },
  {
    path: '/payments/payouts',
    element: (
      <FinanceRoute>
        <PayoutConfirmationPage />
      </FinanceRoute>
    ),
  },

  // CRM routes
  {
    path: '/crm',
    element: (
      <SupportRoute>
        <CRMPage />
      </SupportRoute>
    ),
  },
  {
    path: '/crm/tickets',
    element: (
      <SupportRoute>
        <TicketListPage />
      </SupportRoute>
    ),
  },
  {
    path: '/crm/tickets/:id',
    element: (
      <SupportRoute>
        <TicketDetailsPage />
      </SupportRoute>
    ),
  },
  {
    path: '/crm/communications',
    element: (
      <SupportRoute>
        <CommunicationHistoryPage />
      </SupportRoute>
    ),
  },

  // Reports routes
  {
    path: '/reports',
    element: (
      <ManagementRoute>
        <ReportsPage />
      </ManagementRoute>
    ),
  },
  {
    path: '/reports/generator',
    element: (
      <ManagementRoute>
        <ReportGeneratorPage />
      </ManagementRoute>
    ),
  },
  {
    path: '/reports/analytics',
    element: (
      <ManagementRoute>
        <AnalyticsPage />
      </ManagementRoute>
    ),
  },
];

export default routes;