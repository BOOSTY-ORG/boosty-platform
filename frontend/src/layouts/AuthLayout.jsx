import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Navigate } from 'react-router-dom';

const AuthLayout = () => {
  const { isAuthenticated, user } = useAuth();

  // Redirect authenticated users to dashboard
  if (isAuthenticated && user) {
    return <Navigate to="/" replace />;
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