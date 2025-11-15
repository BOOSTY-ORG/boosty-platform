// src/pages/auth/GetStarted.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';

const GetStarted = () => {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/auth/login');
  };

  const handleRegisterClick = () => {
    navigate('/auth/register');
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(/bkg.jpg)',
          backgroundPosition: 'center bottom'
        }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-400 via-sky-300/70 to-transparent" />
      
      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col px-6 pt-16">
        {/* Top Section with Text */}
        <div className="flex-1 flex flex-col justify-center text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Choose Your Path
          </h1>
          <p className="text-xl text-gray-800 leading-relaxed mb-12">
            Join us in creating a sustainable future<br />with clean energy solutions
          </p>
        </div>
        
        {/* Bottom Section with Buttons */}
        <div className="pb-8 space-y-4">
          <button
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 text-xl font-semibold py-5 rounded-full shadow-lg transition-colors"
            onClick={handleLoginClick}
          >
            Sign In
          </button>
          <button
            className="w-full bg-white hover:bg-gray-100 text-gray-900 text-xl font-semibold py-5 rounded-full shadow-lg transition-colors border-2 border-gray-200"
            onClick={handleRegisterClick}
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default GetStarted;