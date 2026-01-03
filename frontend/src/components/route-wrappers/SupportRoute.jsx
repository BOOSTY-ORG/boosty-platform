import React from 'react';
import { Navigate } from 'react-router-dom';

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

export default SupportRoute;