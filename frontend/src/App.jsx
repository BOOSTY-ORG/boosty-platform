import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext.jsx';
import { AppProvider } from './context/AppContext.jsx';
import routes from './routes/index.js';

// Layouts
import AuthLayout from './layouts/AuthLayout.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';

// Pages
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import Onboarding from './pages/auth/Onboarding.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import ResetPassword from './pages/auth/ResetPassword.jsx';
import DashboardHome from './pages/dashboard/DashboardHome.jsx';
import AdminDashboard from './pages/dashboard/AdminDashboard.jsx';
import FinanceDashboard from './pages/dashboard/FinanceDashboard.jsx';
import SupportDashboard from './pages/dashboard/SupportDashboard.jsx';
import ManagementDashboard from './pages/dashboard/ManagementDashboard.jsx';
import NotFound from './pages/NotFound.jsx';

import './styles/index.css';

function App() {
  return (
    <Router>
      <AppProvider>
        <AuthProvider>
          <div className="App">
            <Routes>
              {/* Auth Routes */}
              <Route path="/auth" element={<AuthLayout />}>
                <Route path="onboarding" element={<Onboarding />} />
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="forgot-password" element={<ForgotPassword />} />
                <Route path="reset-password" element={<ResetPassword />} />
              </Route>

              {/* Landing Route - Onboarding */}
              <Route path="/" element={<Onboarding />} />

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