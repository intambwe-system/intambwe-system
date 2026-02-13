import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, GraduationCap, KeyRound } from 'lucide-react';
import { useStudentAuth } from '../../../contexts/StudentAuthContext';
import { useNavigate } from 'react-router-dom';

export default function StudentLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // First login state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [tempStudentData, setTempStudentData] = useState(null);

  const { login, firstLogin, isAuthenticated, loading: authLoading } = useStudentAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate('/student/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login({ std_email: email, std_password: password });

    if (result.success) {
      if (result.requirePasswordChange) {
        // First login - show password change form
        setTempStudentData(result.studentData);
        setShowPasswordChange(true);
        setError('');
      } else {
        navigate('/student/dashboard');
      }
    } else {
      setError(result.message || 'Invalid email or password');
    }

    setLoading(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const result = await firstLogin({
      std_email: email,
      temporaryPassword: password,
      newPassword: newPassword
    });

    if (result.success) {
      navigate('/student/dashboard');
    } else {
      setError(result.message || 'Failed to change password');
    }

    setLoading(false);
  };

  // Password Change Form (First Login)
  if (showPasswordChange) {
    return (
      <div className="flex min-h-screen">
        {/* Left Side - Password Change Form */}
        <div className="flex-1 flex items-center justify-center p-8 bg-white">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                <KeyRound className="w-8 h-8 text-amber-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Set Your Password</h1>
              <p className="text-gray-600">
                Welcome, <span className="font-medium">{tempStudentData?.std_fname}</span>! Please create a new password to secure your account.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Info Box */}
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                This is your first login. For security, please create a new password that you'll remember.
              </p>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-6">
              {/* New Password Input */}
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                    placeholder="Enter new password"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                    placeholder="Confirm new password"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="text-sm text-gray-500">
                <p>Password must:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li className={newPassword.length >= 6 ? 'text-green-600' : ''}>
                    Be at least 6 characters long
                  </li>
                  <li className={newPassword === confirmPassword && confirmPassword.length > 0 ? 'text-green-600' : ''}>
                    Match the confirmation
                  </li>
                </ul>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  'Set Password & Continue'
                )}
              </button>

              {/* Back Button */}
              <button
                type="button"
                onClick={() => {
                  setShowPasswordChange(false);
                  setNewPassword('');
                  setConfirmPassword('');
                  setPassword('');
                  setError('');
                }}
                className="w-full text-gray-600 py-2 text-sm hover:text-gray-800"
              >
                Back to login
              </button>
            </form>
          </div>
        </div>

        {/* Right Side - Image */}
        <div className="hidden lg:flex flex-1 bg-gradient-to-br from-amber-500 to-amber-700 items-center justify-center p-8">
          <div className="max-w-md text-white">
            <h2 className="text-4xl font-bold mb-4">Secure Your Account</h2>
            <p className="text-amber-100 text-lg">
              Creating a strong password helps protect your academic information and exam data.
            </p>
            <div className="mt-8 flex items-center justify-center">
              <div className="w-64 h-64 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <KeyRound className="w-32 h-32 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular Login Form
  return (
    <div className="flex min-h-screen">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <GraduationCap className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Portal</h1>
            <p className="text-gray-600">Sign in to access your exams and courses</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember"
                  type="checkbox"
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <a href="/auth/student/forgot-password" className="text-sm font-medium text-green-600 hover:text-green-500">
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Staff Login Link */}
          <p className="mt-6 text-center text-sm text-gray-600">
            Are you a staff member?{' '}
            <a href="/auth/employee/login" className="font-medium text-green-600 hover:text-green-500">
              Staff Login
            </a>
          </p>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-green-600 to-green-800 items-center justify-center p-8">
        <div className="max-w-md text-white">
          <h2 className="text-4xl font-bold mb-4">Welcome to Your Learning Journey</h2>
          <p className="text-green-100 text-lg">
            Access your exams, view your grades, and track your academic progress all in one place.
          </p>
          <div className="mt-8 flex items-center justify-center">
            <div className="w-64 h-64 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <GraduationCap className="w-32 h-32 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
