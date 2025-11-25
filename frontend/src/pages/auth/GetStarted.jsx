// src/pages/auth/GetStarted.jsx

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const GetStarted = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const containerRef = useRef(null);

  // Slides data
  const slides = [
    {
      title: 'OWN.',
      subtitle: 'Experience the Universe.'
    },
    {
      title: 'EXPLORE.',
      subtitle: 'Discover New Worlds.'
    },
    {
      title: 'INVEST.',
      subtitle: 'Build Your Future.'
    }
  ];

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
      // Swipe left → Navigate to Roles page
      navigate('/auth/roles');
    }
    if (isRightSwipe) {
      // Swipe right → Navigate to Register page
      navigate('/auth/register');
    }
  };

  // Navigate to specific slide
  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  // Auto-advance slides
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prevSlide) => (prevSlide + 1) % slides.length);
    }, 5000);
    
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleLoginClick = () => {
    navigate('/auth/roles');
  };

  const handleRegisterClick = () => {
    navigate('/auth/register');
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
        
        {/* Hero Image */}
        <div className="flex justify-center mb-8">
          <div className="w-64 h-64 md:w-80 md:h-80 rounded-lg overflow-hidden">
            <img 
              src="/solar_planets.png" 
              alt="Solar System" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        
        {/* Carousel Container */}
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="w-full max-w-md h-32 relative overflow-hidden">
            {/* Slides */}
            <div 
              className="flex h-full transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {slides.map((slide, index) => (
                <div 
                  key={index}
                  className="w-full flex-shrink-0 flex flex-col justify-center items-center text-center px-6"
                >
                  <h1 className="text-4xl font-bold text-black mb-2 tracking-wider">
                    {slide.title}
                  </h1>
                  <p className="text-lg text-gray-600 font-light">
                    {slide.subtitle}
                  </p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Pagination Dots */}
          <div className="flex space-x-2 mt-6">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  currentSlide === index 
                    ? 'bg-yellow-500 w-8' 
                    : 'bg-gray-400 hover:bg-gray-600'
                }`}
                onClick={() => goToSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
        
        {/* Buttons - Stacked Horizontally */}
        <div className="flex space-x-4 mb-6">
          <button
            className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-4 rounded-full transition-colors shadow-lg"
            onClick={handleRegisterClick}
          >
            Get Started
          </button>
          <button
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-4 rounded-full transition-colors"
            onClick={handleLoginClick}
          >
            Log In
          </button>
        </div>
      </div>
      
      {/* Bottom Indicator Bar */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-2">
        <div className="w-32 h-1 bg-gray-300 rounded-full"></div>
      </div>
    </div>
  );
};

export default GetStarted;