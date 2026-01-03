import { useState } from 'react';
import { ArrowLeft, Mail, Lock, EyeOff, Eye, Key, AlertCircle } from 'lucide-react';

// Admin Portal Component
export function AdminSignIn() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    adminId: '',
    rememberDevice: false
  });

  const handleBack = () => {
    console.log('Navigate back to Roles screen');
    alert('Navigating back to Roles screen');
  };

  const handleNeedHelp = () => {
    console.log('Need help clicked');
    alert('Opening help');
  };

  const handleAdminSignIn = () => {
    console.log('Admin sign in with:', formData);
    alert('Admin signing in...');
  };

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header with Back Button and Logo */}
      <div className="flex items-center justify-between px-6 pt-6 pb-8">
        <button 
          onClick={handleBack}
          className="w-12 h-12 rounded-full border-2 border-gray-900 flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-900" />
        </button>
        <div className="flex-1 flex justify-center">
          <img 
            src="/boosty_logo.png" 
            alt="Boosty Logo" 
            className="h-16"
          />
        </div>
        <div className="w-12" />
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6">
        {/* Title and Subtitle */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Admin Portal
          </h1>
          <p className="text-gray-400 text-base">
            Authorized personnel only. Sign in to access admin control
          </p>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          {/* Admin Email */}
          <div>
            <label className="block text-gray-900 text-base font-medium mb-2">
              Admin Email
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Mail className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@example.com"
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-500 transition-colors"
              />
            </div>
          </div>

          {/* Admin Password */}
          <div>
            <label className="block text-gray-900 text-base font-medium mb-2">
              Admin Password
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Lock className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="enter admin password"
                className="w-full pl-12 pr-12 py-4 border-2 border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <Eye className="w-5 h-5 text-gray-400" />
                ) : (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* Admin ID */}
          <div>
            <label className="block text-gray-900 text-base font-medium mb-2">
              Admin ID
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Key className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="adminId"
                value={formData.adminId}
                onChange={handleChange}
                placeholder="check your email"
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-500 transition-colors"
              />
            </div>
          </div>

          {/* Remember Device and Need Help */}
          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="rememberDevice"
                checked={formData.rememberDevice}
                onChange={handleChange}
                className="w-5 h-5 border-2 border-gray-300 rounded cursor-pointer"
              />
              <span className="text-gray-400 text-base">Remember this device</span>
            </label>
            <button
              onClick={handleNeedHelp}
              className="text-gray-900 text-base font-medium hover:text-gray-600 transition-colors"
            >
              Need help?
            </button>
          </div>

          {/* Admin Sign In Button */}
          <button
            onClick={handleAdminSignIn}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 text-lg font-semibold py-4 rounded-xl shadow-md transition-colors mt-8"
          >
            Admin Sign In
          </button>
        </div>

        {/* Security Notice */}
        <div className="mt-8 bg-gray-50 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-gray-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-gray-900 text-base font-semibold mb-1">
                Security Notice
              </h3>
              <p className="text-gray-500 text-sm">
                All admins is monitored and logged for security purposes
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// User Portal Component
export function UserSignIn() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const handleBack = () => {
    console.log('Navigate back to Roles screen');
    alert('Navigating back to Roles screen');
  };

  const handleForgotPassword = () => {
    console.log('Forgot password clicked');
    alert('Opening password reset');
  };

  const handleSignUp = () => {
    console.log('Navigate to Sign Up page');
    alert('Navigating to Sign Up page');
  };

  const handleSignIn = () => {
    console.log('User sign in with:', formData);
    alert('User signing in...');
  };

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header with Back Button and Logo */}
      <div className="flex items-center justify-between px-6 pt-6 pb-8">
        <button 
          onClick={handleBack}
          className="w-12 h-12 flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-8 h-8 text-gray-300" strokeWidth={2.5} />
        </button>
        <div className="flex-1 flex justify-center">
          <img 
            src="/boosty_logo.png" 
            alt="Boosty Logo" 
            className="h-16"
          />
        </div>
        <div className="w-12" />
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6">
        {/* Title and Subtitle */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            User Portal
          </h1>
          <p className="text-gray-400 text-base">
            Sign-in to access your dashboard and account settings
          </p>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          {/* Email Address */}
          <div>
            <label className="block text-gray-900 text-base font-medium mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Mail className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-500 transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-gray-900 text-base font-medium mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Lock className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="enter password"
                className="w-full pl-12 pr-12 py-4 border-2 border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <Eye className="w-5 h-5 text-gray-400" />
                ) : (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me and Forgot Password */}
          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="w-5 h-5 border-2 border-gray-300 rounded cursor-pointer"
              />
              <span className="text-gray-400 text-base">Remember me</span>
            </label>
            <button
              onClick={handleForgotPassword}
              className="text-gray-900 text-base font-medium hover:text-gray-600 transition-colors"
            >
              Forgot Password?
            </button>
          </div>

          {/* Sign In Button */}
          <button
            onClick={handleSignIn}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 text-lg font-semibold py-4 rounded-xl shadow-md transition-colors mt-8"
          >
            Sign In
          </button>

          {/* Sign Up Link */}
          <div className="text-center pt-4">
            <p className="text-gray-400 text-base">
              Don't have an account?{' '}
              <button
                onClick={handleSignUp}
                className="text-yellow-500 font-medium hover:text-yellow-600 transition-colors"
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Default export for main component (you can choose which one to display)
export default function SignIn({ type = 'user' }) {
  return type === 'admin' ? <AdminSignIn /> : <UserSignIn />;
}