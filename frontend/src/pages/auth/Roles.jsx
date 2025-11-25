// src/pages/auth/Roles.jsx

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, User, ChevronRight } from 'lucide-react';

const Roles = () => {
  const navigate = useNavigate();
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const containerRef = useRef(null);

  // Minimum swipe distance
  const minSwipeDistance = 50;

  // Handle touch start
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  // Handle touch move
  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  // Handle touch end
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      // Swipe left → Navigate to User Login page
      navigate('/auth/login?role=user');
    }
    if (isRightSwipe) {
      // Swipe right → Navigate back to Get Started screen
      navigate('/auth/get-started');
    }
  };

  const handleBackClick = () => {
    navigate('/auth/get-started');
  };

  const handleAdminLogin = () => {
    navigate('/auth/login?role=admin');
  };

  const handleUserLogin = () => {
    navigate('/auth/login?role=user');
  };

  const handleGuestSignIn = () => {
    navigate('/auth/login?role=guest');
  };

  const handleDashboardClick = () => {
    navigate('/dashboard');
  };

  const handleInvestorsClick = () => {
    navigate('/investors');
  };

  const handleUsersClick = () => {
    navigate('/users');
  };

  return (
    <div 
      className="min-h-screen flex flex-col relative overflow-hidden bg-white"
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col px-6 pt-12 pb-20">
        {/* Back Button */}
        <div className="w-full flex justify-start mb-6">
          <button
            onClick={handleBackClick}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
        </div>

        {/* Logo and Tagline */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/boosty_logo.png"
            alt="Boosty"
            className="h-16 w-auto mb-2"
          />
          <p className="text-gray-600 text-sm font-light tracking-wide">
            Your Gateway to the Cosmos
          </p>
        </div>
        
        {/* Welcome Message */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Back!
          </h1>
          <p className="text-lg text-gray-600">
            Choose how you'd like to continue
          </p>
        </div>
        
        {/* Login Options */}
        <div className="flex-1 flex flex-col justify-center space-y-4 mb-8">
          {/* Admin Login Card */}
          <div 
            className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-yellow-500 group"
            onClick={handleAdminLogin}
          >
            <div className="flex items-start">
              <div className="bg-yellow-100 p-3 rounded-lg mr-4 group-hover:bg-yellow-200 transition-colors">
                <Settings className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Admin Log In</h3>
                <p className="text-gray-600 text-sm">
                  Access the admin dashboard to manage users, investors, and platform settings
                </p>
                <div className="flex items-center mt-2 text-yellow-600 group-hover:text-yellow-700 transition-colors">
                  <span className="text-sm font-medium">Continue as Admin</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </div>
          </div>

          {/* User Login Card */}
          <div 
            className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-yellow-500 group"
            onClick={handleUserLogin}
          >
            <div className="flex items-start">
              <div className="bg-yellow-100 p-3 rounded-lg mr-4 group-hover:bg-yellow-200 transition-colors">
                <User className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">User Log In</h3>
                <p className="text-gray-600 text-sm">
                  Access your personal dashboard to manage your investments and profile
                </p>
                <div className="flex items-center mt-2 text-yellow-600 group-hover:text-yellow-700 transition-colors">
                  <span className="text-sm font-medium">Continue as User</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Guest Sign In */}
        <div className="text-center mb-8">
          <button
            onClick={handleGuestSignIn}
            className="text-yellow-600 hover:text-yellow-700 font-medium transition-colors"
          >
            Sign In as Guest
          </button>
        </div>
        
        {/* Pagination Dots */}
        <div className="flex justify-center space-x-2 mb-8">
          <button
            className="w-2 h-2 rounded-full bg-gray-400 hover:bg-gray-600 transition-colors"
            onClick={() => navigate('/auth/get-started')}
            aria-label="Go to Get Started"
          />
          <button
            className="w-2 h-2 rounded-full bg-gray-400 hover:bg-gray-600 transition-colors"
            onClick={() => navigate('/auth/get-started')}
            aria-label="Go to previous screen"
          />
          <button
            className="w-8 h-2 rounded-full bg-yellow-500 transition-all"
            aria-label="Current screen: Roles"
          />
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex justify-around py-2">
          <button
            onClick={handleDashboardClick}
            className="flex flex-col items-center p-2 text-gray-600 hover:text-yellow-600 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-gray-300 mb-1"></div>
            <span className="text-xs">Dashboard</span>
          </button>
          <button
            onClick={handleInvestorsClick}
            className="flex flex-col items-center p-2 text-gray-600 hover:text-yellow-600 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-gray-300 mb-1"></div>
            <span className="text-xs">Investors</span>
          </button>
          <button
            onClick={handleUsersClick}
            className="flex flex-col items-center p-2 text-gray-600 hover:text-yellow-600 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-gray-300 mb-1"></div>
            <span className="text-xs">Users</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Roles;