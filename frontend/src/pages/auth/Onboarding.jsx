// src/pages/auth/Onboarding.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';

const Onboarding = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/auth/login');
  };

  return (
    // Main container
    <div className="relative w-[440px] h-[956px] mx-auto bg-white overflow-hidden rounded-[30px]">
      {/* Background Image - Full Cover */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          background: "url('bkg.png'), #FFFFFF",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col justify-between h-full pt-[236px]">
        {/* Welcome Text */}
        <div className="flex flex-col items-center gap-2 px-14">
          <h1 className="font-open-sans text-black text-[30px] font-bold leading-10 text-center">
            Welcome To a Brighter Future
          </h1>
          <p className="font-open-sans text-black text-lg font-semibold leading-[22px] text-center tracking-[0.02em]">
            Generate clean energy, save on bills, and track your impact
          </p>
        </div>
        
        {/* Get Started Button */}
        <div className="flex justify-center items-center pb-20 px-9">
          <button 
            onClick={handleGetStarted}
            className="w-full max-w-[365px] h-10 bg-[#F3B921] hover:bg-[#e5a815] active:scale-95 rounded-[20px] font-open-sans text-black text-base font-semibold leading-5 text-center transition-all duration-150 ease-in-out"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;