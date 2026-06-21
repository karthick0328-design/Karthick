'use client';

import { useState, ChangeEvent, FormEvent, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ResponsiveNav from '../../app/Compontent/Header';
import Footer from '../../app/Compontent/Footer';

const VerifyEmail: React.FC = () => {
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus management for OTP inputs
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string): void => {
    if (!/^\d?$/.test(value)) return; // Only allow numbers

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Auto-focus next input
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

      // Focus the next empty input or last input
      const nextIndex = Math.min(newCode.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  // Corrected ref callback function
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
      const response = await fetch(`http://localhost:5000/api/auth/verify-reset-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ otp: enteredCode }),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.message === 'Code verified successfully') {
          localStorage.setItem('resetOtp', enteredCode);
          router.push('/Verify/Confirmation');
        } else {
          setError('Verification failed. Please try again.');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Invalid code. Please try again.');
      }
    } catch (error) {
      console.error('Error during API request:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async (): Promise<void> => {
    setResendLoading(true);
    setError('');
    setResendSuccess('');

    try {
      // Simulate API call for resend code
      await new Promise(resolve => setTimeout(resolve, 1000));
      setResendSuccess('Verification code has been resent to your email!');
    } catch (err) {
      console.error('Error during resend code request:', err);
      setError('Failed to resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <>
      <ResponsiveNav />
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br bg-red-50">
        <div className="w-full max-w-lg mx-auto p-6">
          {/* Animated Background Card */}
          <div className="relative">
            {/* Background Decoration */}
            <div className="absolute -inset-4 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl blur-lg opacity-20 transition duration-1000 animate-pulse"></div>

            {/* Main Card */}
            <div className="relative bg-white dark:bg-red-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              {/* Header Gradient */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-red-600 to-red-600"></div>

              <div className="p-8">
                {/* Icon Section */}
                <div className="text-center mb-8">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-600 to-red-600 rounded-full flex items-center justify-center shadow-lg mb-6">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-3">
                    Verify Your Email
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
                    We have sent a 6-digit verification code to<br />
                    <span className="font-semibold text-red-600 dark:text-red-400">hi@tekkubit.com</span>
                  </p>
                </div>

                {/* OTP Form */}
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* OTP Inputs */}
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 text-center">
                      Enter Verification Code
                    </label>
                    <div className="flex justify-center items-center gap-3">
                      {code.map((digit, index) => (
                        <input
                          key={index}
                          ref={setInputRef(index)}
                          className="h-16 w-16 flex items-center justify-center text-center text-2xl font-bold rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white outline-none transition-all duration-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-500/20 focus:bg-white dark:focus:bg-gray-600 shadow-sm"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          value={digit}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          onPaste={index === 0 ? handlePaste : undefined}
                          onFocus={(e) => e.target.select()}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Status Messages */}
                  {error && (
                    <div className="flex items-center justify-center space-x-2 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-4 py-3 rounded-lg border border-rose-200 dark:border-rose-800">
                      <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">{error}</span>
                    </div>
                  )}

                  {resendSuccess && (
                    <div className="flex items-center justify-center space-x-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-4 py-3 rounded-lg border border-green-200 dark:border-green-800">
                      <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">{resendSuccess}</span>
                    </div>
                  )}

                  {/* Verify Button */}
                  <button
                    type="submit"
                    disabled={loading || code.join('').length !== 6}
                    className="w-full py-4 px-4 inline-flex justify-center items-center gap-2 rounded-xl border border-transparent font-semibold bg-gradient-to-r from-red-600 to-red-600 hover:from-red-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-bold"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Verifying...
                      </>
                    ) : (
                      <>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Verify Account
                      </>
                    )}
                  </button>

                  {/* Resend Code Section */}
                  <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                      Did not receive the code?
                    </p>
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendLoading}
                      className="inline-flex items-center gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resendLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Resend Verification Code
                        </>
                      )}
                    </button>
                  </div>

                  {/* Back to Login */}
                  <div className="text-center">
                    <Link
                      href="/Login/Signin"
                      className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors duration-200 font-medium text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Back to Login
                    </Link>
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

export default VerifyEmail;