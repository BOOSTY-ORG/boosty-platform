import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext.jsx';
import { AppProvider } from './context/AppContext.jsx';
import routes from './routes/index.jsx';

// Layouts
import AuthLayout from './layouts/AuthLayout.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';

// Pages
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import Onboarding from './pages/auth/Onboarding.jsx';
import GetStarted from './pages/auth/GetStarted.jsx';
import Roles from './pages/auth/Roles.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import ResetPassword from './pages/auth/ResetPassword.jsx';
import SignInTest from './pages/auth/SignInTest.jsx';
import DashboardHome from './pages/dashboard/DashboardHome.jsx';
import AdminDashboard from './pages/dashboard/AdminDashboard.jsx';
import FinanceDashboard from './pages/dashboard/FinanceDashboard.jsx';
import SupportDashboard from './pages/dashboard/SupportDashboard.jsx';
import ManagementDashboard from './pages/dashboard/ManagementDashboard.jsx';
import NotFound from './pages/NotFound.jsx';

import './styles/index.css';

function App() {
  return (
    <Router
      future={{
        // React Router v7 future flags to resolve deprecation warnings
        // and prepare for upcoming version compatibility
        v7_startTransition: true, // Enables React's startTransition API for navigation state updates
        v7_relativeSplatPath: true // Updates behavior for relative splat routes to match v7 specifications
      }}
    >
      <AppProvider>
        <AuthProvider>
          <div className="App">
            <Routes>
              {/* Full-screen auth routes (without AuthLayout) */}
              <Route path="/auth/onboarding" element={<Onboarding />} />
              <Route path="/auth/get-started" element={<GetStarted />} />
              <Route path="/auth/roles" element={<Roles />} />
              
              {/* Landing Route - Onboarding */}
              <Route path="/" element={<Onboarding />} />
              
              {/* Auth Routes with Layout */}
              <Route path="/auth" element={<AuthLayout />}>
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="forgot-password" element={<ForgotPassword />} />
                <Route path="reset-password" element={<ResetPassword />} />
              </Route>

              {/* Test Route */}
              <Route path="/test/signin" element={<SignInTest />} />

              {/* Dashboard Routes */}
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<DashboardHome />} />
                <Route path="admin" element={<AdminDashboard />} />
                <Route path="finance" element={<FinanceDashboard />} />
                <Route path="support" element={<SupportDashboard />} />
                <Route path="management" element={<ManagementDashboard />} />
              </Route>

              {/* Dynamic Routes */}
              {routes.map((route, index) => (
                <Route key={index} path={route.path} element={route.element} />
              ))}

              {/* 404 Page */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster position="top-right" />
          </div>
        </AuthProvider>
      </AppProvider>
    </Router>
  );
}

export default App;