'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface PreviousExperience {
  prevCompany: string;
  prevRole: string;
  prevYearOfExperience: string;
}

interface SignupData {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  studying: boolean;
  working: boolean;
  department?: string;
  role?: string;
  company?: string;
  college?: string;
  degree?: string;
  highestDegree?: string;
  category?: string;
  currentYear?: string;
  passOutYear?: string;
  yearOfExperience?: string;
  previousExperiences?: PreviousExperience[];
  hubField?: string;
  isWhatsApp?: boolean;
}

const useSignup = () => {
  const [loading, setLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isNameTaken, setIsNameTaken] = useState(false);
  const [isEmailTaken, setIsEmailTaken] = useState(false);
  const router = useRouter();

  const handleSignup = async (data: SignupData) => {
    setLoading(true);
    setServerMessage(null);
    setIsNameTaken(false);
    setIsEmailTaken(false);
    console.log('🔍 Sending Signup Request:', {
      ...data,
      password: '*'.repeat(data.password.length),
    });

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/signup`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ Signup Response:', response.data);
      const { token, user, message } = response.data;

      if (user?.id && user?.name && token) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setServerMessage(message || 'Signup successful!');
        toast.success('Signup successful!');
        setTimeout(() => router.push('/dashboard'), 1000);
      } else {
        throw new Error('Invalid response data');
      }
    } catch (error: any) {
      console.error('❌ Signup Error:', error);

      if (error.response) {
        console.error('🚨 Server Response:', error.response.data);

        if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          const errorMessages = error.response.data.errors
            .map((err: { field: string; message: string }) => err.message)
            .join(', ');
          setServerMessage(errorMessages);

          if (error.response.data.isNameTaken) {
            setIsNameTaken(true);
            toast(errorMessages, {
              icon: 'ℹ️',
              style: {
                background: '#f0f7ff',
                color: '#0066cc',
              },
            });
          } else if (error.response.data.isEmailTaken) {
            setIsEmailTaken(true);
            toast(errorMessages, {
              icon: 'ℹ️',
              style: {
                background: '#f0f7ff',
                color: '#0066cc',
              },
            });
          } else {
            toast.error(errorMessages || 'Signup failed. Please check your input.');
          }
        } else {
          setServerMessage(error.response.data.message || 'Signup failed');
          toast.error(error.response.data.message || 'Signup failed. Please try again.');
        }
      } else if (error.request) {
        console.error('🚫 No Response from Server');
        setServerMessage('Server is not responding. Please try again later.');
        toast.error('Server is not responding. Please try again later.');
      } else {
        console.error('❌ Unknown Error:', error.message);
        setServerMessage('An unexpected error occurred. Please try again.');
        toast.error('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return { handleSignup, loading, serverMessage, isNameTaken, isEmailTaken };
};

export default useSignup;