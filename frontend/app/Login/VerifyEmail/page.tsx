'use client';

import { useState, ChangeEvent, FormEvent, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import Header from '../../Compontent/Header';
import Footer from '../../Compontent/Footer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const VerifyEmailContent: React.FC = () => {
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [initialSendDone, setInitialSendDone] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
    
    // Get user info from localStorage to know where to send to and to get token
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        if (user.email) {
          setUserEmail(user.email);
        }
      } catch (e) {
        console.error('Error parsing user', e);
      }
    } else {
      router.push('/Login/Signin');
    }
  }, [router]);

  // Optionally send OTP on first load if we want it automatic
  useEffect(() => {
    if (userEmail && !initialSendDone) {
      handleResendCode();
      setInitialSendDone(true);
    }
  }, [userEmail, initialSendDone]);

  const handleChange = (index: number, value: string): void => {
    if (!/^\d?$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>): void => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newCode = pastedData.split('').slice(0, 6);
      setCode([...newCode, ...Array(6 - newCode.length).fill('')]);

      const nextIndex = Math.min(newCode.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const setInputRef = (index: number) => (el: HTMLInputElement | null) => {
    inputRefs.current[index] = el;
  };

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const enteredCode = code.join('');

    if (enteredCode.length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/auth/verify-login-otp`, 
        { otp: enteredCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('Email verified successfully!');
        router.push(`/Login/Attendance?redirect=${encodeURIComponent(redirectPath)}`);
      } else {
        setError(response.data.message || 'Verification failed. Please try again.');
        toast.error(response.data.message || 'Verification failed.');
      }
    } catch (err: any) {
      console.error('Error during API request:', err);
      const msg = err.response?.data?.message || 'Network error. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async (): Promise<void> => {
    setResendLoading(true);
    setError('');
    setResendSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/auth/send-login-otp`, 
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setResendSuccess('Verification code has been sent to your email!');
        toast.success('Verification code sent!');
      } else {
        setError('Failed to send code.');
      }
    } catch (err: any) {
      console.error('Error during resend code request:', err);
      setError('Failed to send code. Please try again.');
      toast.error('Failed to send verification code.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br bg-blue-50">
        <div className="w-full max-w-lg mx-auto p-6">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl blur-lg opacity-20 transition duration-1000 animate-pulse"></div>
            <div className="relative bg-white dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>

              <div className="p-8">
                <div className="text-center mb-8">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg mb-6">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-3">
                    Verify Your Email
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
                    We have sent a 6-digit verification code to<br />
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{userEmail || 'your email'}</span>
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 text-center">
                      Enter Verification Code
                    </label>
                    <div className="flex justify-center items-center gap-3">
                      {code.map((digit, index) => (
                        <input
                          key={index}
                          ref={setInputRef(index)}
                          className="h-16 w-16 flex items-center justify-center text-center text-2xl font-bold rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/20 focus:bg-white dark:focus:bg-gray-600 shadow-sm"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          value={digit}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          onPaste={index === 0 ? handlePaste : undefined}
                          onFocus={(e) => e.target.select()}
                          suppressHydrationWarning
                        />
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center justify-center space-x-2 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-4 py-3 rounded-lg border border-rose-200 dark:border-rose-800">
                      <span className="text-sm font-medium">{error}</span>
                    </div>
                  )}

                  {resendSuccess && (
                    <div className="flex items-center justify-center space-x-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-4 py-3 rounded-lg border border-green-200 dark:border-green-800">
                      <span className="text-sm font-medium">{resendSuccess}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || code.join('').length !== 6}
                    className="w-full py-4 px-4 inline-flex justify-center items-center gap-2 rounded-xl border border-transparent font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-bold"
                  >
                    {loading ? 'Verifying...' : 'Verify and Continue'}
                  </button>

                  <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                      Did not receive the code?
                    </p>
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendLoading}
                      suppressHydrationWarning
                      className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resendLoading ? 'Sending...' : 'Resend Verification Code'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

const VerifyEmail = () => {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerifyEmailContent />
        </Suspense>
    );
};

export default VerifyEmail;
