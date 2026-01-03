import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Navigate } from 'react-router-dom';

const AuthLayout = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  console.log('AuthLayout: State', { isAuthenticated, user, isLoading });

  // Redirect authenticated users to appropriate dashboard
  if (isAuthenticated && user) {
    console.log('AuthLayout: Redirecting authenticated user', { userRole: user.role });
    if (user.role === 'admin') {
      return <Navigate to="/dashboard/admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;