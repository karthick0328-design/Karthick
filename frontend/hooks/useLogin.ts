'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const useLogin = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    console.log('🔍 Sending Login Request:', { email });

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/login`,
        { email, password },
        { headers: { 'Content-Type': 'application/json' } }
      );

      console.log('✅ Login Response:', response.data);
      const { token, user } = response.data;

      if (token && user?.id) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        toast.success('Login successful!');
        router.push('/admin-dashboard');
      } else {
        throw new Error('Invalid response data');
      }
    } catch (error: any) {
      console.error('❌ Login Error:', error);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.details?.email ||
        error.response?.data?.details?.password ||
        'Something went wrong. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { error, handleLogin, loading };
};

export default useLogin;