// src/pages/auth/Onboarding.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';

const Onboarding = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/auth/login');
  };

  return (
    // Main container with background image
    <div
      className="relative flex flex-col justify-between w-full h-screen max-w-md mx-auto bg-gradient-to-b from-blue-50 to-white overflow-hidden rounded-[30px]"
      style={{
        backgroundImage: "url('/bkg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Status Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between h-11 px-5">
        <span className="font-sf-pro-display text-black text-[18px] font-semibold leading-none tracking-tight">
          19:02
        </span>
        <div className="flex items-center gap-2.5">
          {/* Wifi Icon */}
          <svg className="w-[18px] h-[13px]" viewBox="0 0 18 13" fill="none">
            <path d="M1 5L9 1L17 5" stroke="black" strokeWidth="2"/>
            <path d="M4 8L9 5.5L14 8" stroke="black" strokeWidth="2"/>
            <path d="M7 11L9 10L11 11" stroke="black" strokeWidth="2"/>
          </svg>
          {/* Battery Icon */}
          <div className="relative w-[26.6px] h-[12.5px]">
            <div className="absolute inset-0 bg-black opacity-40 rounded-sm"></div>
            <div className="absolute left-[7.23%] right-[16.87%] top-[15.38%] bottom-[15.39%] bg-black rounded-sm"></div>
            <div className="absolute -right-[3.3px] top-[3.75px] w-[3.3px] h-[4.95px] bg-black rounded-r-sm"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col justify-between h-full pt-[236px]">
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