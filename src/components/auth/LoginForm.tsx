// src/components/auth/LoginForm.tsx - Updated for mobile-based login with OTP
import React, { useState } from 'react';
import { Eye, EyeOff, CheckSquare, Phone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../common/Button';
import { useNavigate } from 'react-router-dom';

export const LoginForm: React.FC = () => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  const { smartLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let result;
      
      if (showOtpInput && otp) {
        // OTP-based login
        result = await smartLogin(mobile, '', otp);
      } else if (password) {
        // Password-based login
        result = await smartLogin(mobile, password, '');
      } else {
        // Request OTP - send empty password and OTP
        result = await smartLogin(mobile, '', '');
        
        // Check if OTP was sent (backend returns message without access_token)
        if (result && (result.message || (!result.success && !result.error))) {
          // OTP was sent successfully
          setOtpSent(true);
          setShowOtpInput(true);
          setPassword(''); // Clear password field
          setError(null);
          setLoading(false);
          return;
        }
      }

      if (result && result.success) {
        navigate('/dashboard');
        return;
      }

      setError(result?.error || 'Login failed. Please check your credentials.');

    } catch (err: any) {
      console.error('Unexpected error during login:', err);
      setError('An unexpected error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only digits
    if (value.length <= 10) {
      setMobile(value);
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only digits
    if (value.length <= 6) {
      setOtp(value);
    }
  };

  const resetForm = () => {
    setShowOtpInput(false);
    setOtpSent(false);
    setOtp('');
    setPassword('');
    setError(null);
  };

  const requestOtp = async () => {
    if (mobile.length !== 10) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await smartLogin(mobile, '', '');
      
      if (result && (result.message || (!result.success && !result.error))) {
        setOtpSent(true);
        setShowOtpInput(true);
        setPassword('');
        setError(null);
      } else {
        setError('Failed to send OTP. Please try again.');
      }
    } catch (err: any) {
      console.error('Error requesting OTP:', err);
      setError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
              <CheckSquare className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Welcome to TaskFlow</h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account to manage tasks and teams
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-lg backdrop-blur-sm bg-opacity-95">
            <div className="space-y-6">
              <div>
                <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number
                </label>
                <div className="relative">
                  <input
                    id="mobile"
                    type="tel"
                    value={mobile}
                    onChange={handleMobileChange}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your 10-digit mobile number"
                    required
                    pattern="[0-9]{10}"
                    maxLength={10}
                  />
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
                {mobile && mobile.length !== 10 && (
                  <p className="text-sm text-red-600 mt-1">Mobile number must be 10 digits</p>
                )}
              </div>

              {showOtpInput ? (
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                    Enter OTP
                  </label>
                  <input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={handleOtpChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter 6-digit OTP"
                    required
                    maxLength={6}
                  />
                  {otpSent && (
                    <p className="text-sm text-green-600 mt-1">OTP sent to your mobile number</p>
                  )}
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-sm text-blue-600 hover:text-blue-800 mt-2"
                  >
                    Use password instead
                  </button>
                </div>
              ) : (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password (optional)
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                      placeholder="Enter password or leave blank for OTP"
                    />
                    {password && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Leave password blank to receive OTP on your mobile
                  </p>
                  {!password && mobile.length === 10 && (
                    <button
                      type="button"
                      onClick={requestOtp}
                      className="text-sm text-blue-600 hover:text-blue-800 mt-2"
                    >
                      Request OTP instead
                    </button>
                  )}
                </div>
              )}

              {error && (
                <div className="text-red-600 text-sm p-3 border border-red-300 rounded-lg bg-red-50">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                loading={loading}
                className="w-full py-3"
                disabled={
                  mobile.length !== 10 || 
                  (showOtpInput && otp.length !== 6) ||
                  loading
                }
              >
                {showOtpInput ? 'Verify OTP' : password ? 'Sign In' : 'Send OTP'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};