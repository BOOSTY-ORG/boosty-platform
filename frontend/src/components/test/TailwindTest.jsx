// Test component to verify Tailwind IntelliSense
import React from 'react';

const TailwindTest = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Tailwind IntelliSense Test
        </h1>
        <p className="text-gray-600 mb-6">
          This component is used to test if Tailwind CSS IntelliSense is working properly.
        </p>
        
        <div className="space-y-4">
          <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
            Primary Button
          </button>
          
          <button className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
            Success Button
          </button>
          
          <button className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
            Danger Button
          </button>
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Test Custom Colors
          </h2>
          <div className="grid grid-cols-5 gap-2">
            <div className="w-10 h-10 bg-primary-500 rounded"></div>
            <div className="w-10 h-10 bg-secondary-500 rounded"></div>
            <div className="w-10 h-10 bg-warning-500 rounded"></div>
            <div className="w-10 h-10 bg-info-500 rounded"></div>
            <div className="w-10 h-10 bg-gray-500 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TailwindTest;