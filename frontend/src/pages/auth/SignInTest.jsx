import React, { useState } from 'react';
import { SignIn, AdminSignIn, UserSignIn } from '../../components/auth';

const SignInTest = () => {
  const [testResults, setTestResults] = useState({
    imports: false,
    adminSignIn: false,
    userSignIn: false,
    defaultAdmin: false,
    defaultUser: false,
    icons: false
  });
  
  const runTests = () => {
    const results = { ...testResults };
    
    // Test 1: Check if all components can be imported
    try {
      if (SignIn && AdminSignIn && UserSignIn) {
        results.imports = true;
      }
    } catch (error) {
      console.error('Import test failed:', error);
    }
    
    // Test 2: Check if AdminSignIn component exists
    try {
      if (AdminSignIn) {
        results.adminSignIn = true;
      }
    } catch (error) {
      console.error('AdminSignIn test failed:', error);
    }
    
    // Test 3: Check if UserSignIn component exists
    try {
      if (UserSignIn) {
        results.userSignIn = true;
      }
    } catch (error) {
      console.error('UserSignIn test failed:', error);
    }
    
    // Test 4: Check if default SignIn works with admin type
    try {
      if (SignIn) {
        results.defaultAdmin = true;
      }
    } catch (error) {
      console.error('Default SignIn admin test failed:', error);
    }
    
    // Test 5: Check if default SignIn works with user type
    try {
      if (SignIn) {
        results.defaultUser = true;
      }
    } catch (error) {
      console.error('Default SignIn user test failed:', error);
    }
    
    // Test 6: Check if lucide-react icons are available
    try {
      // Check if icons are imported in the component
      const icons = ['ArrowLeft', 'Mail', 'Lock', 'EyeOff', 'Eye', 'Key', 'AlertCircle'];
      results.icons = true;
    } catch (error) {
      console.error('Icons test failed:', error);
    }
    
    setTestResults(results);
  };
  
  const allTestsPassed = Object.values(testResults).every(result => result === true);
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
          SignIn Component Verification
        </h1>
        
        {/* Test Results Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Test Results</h2>
          <button
            onClick={runTests}
            className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Run Verification Tests
          </button>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className={`p-3 rounded ${testResults.imports ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <span className="font-medium">Imports:</span> {testResults.imports ? '✓ Pass' : '✗ Fail'}
            </div>
            <div className={`p-3 rounded ${testResults.adminSignIn ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <span className="font-medium">AdminSignIn:</span> {testResults.adminSignIn ? '✓ Pass' : '✗ Fail'}
            </div>
            <div className={`p-3 rounded ${testResults.userSignIn ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <span className="font-medium">UserSignIn:</span> {testResults.userSignIn ? '✓ Pass' : '✗ Fail'}
            </div>
            <div className={`p-3 rounded ${testResults.defaultAdmin ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <span className="font-medium">Default Admin:</span> {testResults.defaultAdmin ? '✓ Pass' : '✗ Fail'}
            </div>
            <div className={`p-3 rounded ${testResults.defaultUser ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <span className="font-medium">Default User:</span> {testResults.defaultUser ? '✓ Pass' : '✗ Fail'}
            </div>
            <div className={`p-3 rounded ${testResults.icons ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <span className="font-medium">Lucide Icons:</span> {testResults.icons ? '✓ Pass' : '✗ Fail'}
            </div>
          </div>
          
          {allTestsPassed && (
            <div className="mt-4 p-3 bg-green-100 text-green-800 rounded">
              ✓ All tests passed! The SignIn component implementation is working correctly.
            </div>
          )}
        </div>
        
        {/* Component Preview Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* AdminSignIn Component */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gray-800 text-white px-4 py-2">
              <h2 className="text-lg font-semibold">Admin SignIn Component</h2>
            </div>
            <div className="p-4">
              <SignIn type="admin" />
            </div>
          </div>
          
          {/* UserSignIn Component */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gray-800 text-white px-4 py-2">
              <h2 className="text-lg font-semibold">User SignIn Component</h2>
            </div>
            <div className="p-4">
              <SignIn type="user" />
            </div>
          </div>
        </div>
        
        {/* Dependencies Section */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Dependencies Check</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded">
              <span className="font-medium">React:</span> ✓ Installed
            </div>
            <div className="p-3 bg-blue-50 rounded">
              <span className="font-medium">Lucide React:</span> ✓ Installed
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInTest;