// src/pages/auth/Onboarding.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';


const Onboarding = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/auth/get-started');
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
            Welcome To a<br />Brighter Future
          </h1>
          <p className="text-xl text-gray-800 leading-relaxed">
            Generate clean energy, save on bills,<br />and track your impact
          </p>
        </div>
        
        {/* Bottom Section with Button */}
        <div className="pb-8">
          <button
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 text-xl font-semibold py-5 rounded-full shadow-lg transition-colors"
            onClick={handleGetStarted}
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;