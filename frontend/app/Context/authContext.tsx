// app/Context/authContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { toastConfig } from '../../utils/toastConfig'; // Fixed: Relative path adjusted from '../../../' to '../../'

type MembershipStatus = 'active' | 'expired';
type MembershipDuration = '1month' | '6months' | 'annual' | null;

interface DecodedToken {
  id: string;
  name: string;
  email: string;
  role: string;
  exp: number;
  membershipType: string | null;
  displayMembershipType: string | null;
  membershipStatus: string;
  membershipExpiry: number | null;
  membershipDuration: MembershipDuration;
  donationSlug: string | null;
  country?: string;
}

interface AuthContextType {
  user: DecodedToken | null;
  hasRole: (role: string) => boolean;
  logout: () => void;
  loading: boolean;
  updateMembership: (
    status: MembershipStatus,
    expiry: number,
    duration: MembershipDuration,
    donationSlug?: string | null,
  ) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const validMembershipStatuses: MembershipStatus[] = ['active', 'expired'];
const validMembershipDurations: MembershipDuration[] = ['1month', '6months', 'annual', null];

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<DecodedToken | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadUserFromToken = useCallback(() => {
    let isMounted = true;
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        if (isMounted) {
          setUser(null);
          localStorage.removeItem('membershipStatus');
          localStorage.removeItem('membershipExpiry');
          localStorage.removeItem('membershipDuration');
          localStorage.removeItem('donationSlug');
        }
        return;
      }

      const decoded: DecodedToken = jwtDecode<DecodedToken>(token);

      if (
        !decoded.id ||
        !decoded.email ||
        !decoded.role ||
        decoded.exp === undefined ||
        typeof decoded.id !== 'string' ||
        typeof decoded.email !== 'string' ||
        typeof decoded.role !== 'string' ||
        typeof decoded.exp !== 'number'
      ) {
        throw new Error('Invalid token: missing or invalid required fields (id, email, role, or exp)');
      }

      if (decoded.exp * 1000 < Date.now()) {
        if (isMounted) {
          toast.error('Session expired. Please log in again.', toastConfig.error);
          localStorage.removeItem('token');
          localStorage.removeItem('membershipStatus');
          localStorage.removeItem('membershipExpiry');
          localStorage.removeItem('membershipDuration');
          localStorage.removeItem('donationSlug');
          setUser(null);
        }
        return;
      }

      const storedStatus = localStorage.getItem('membershipStatus');
      const storedExpiry = localStorage.getItem('membershipExpiry');
      const storedDuration = localStorage.getItem('membershipDuration');
      const storedDonationSlug = localStorage.getItem('donationSlug');

      const membershipStatus =
        validMembershipStatuses.includes((storedStatus || decoded.membershipStatus) as MembershipStatus)
          ? (storedStatus || decoded.membershipStatus || 'expired') as MembershipStatus
          : 'expired';

      const membershipExpiry =
        storedExpiry && !isNaN(parseInt(storedExpiry, 10))
          ? parseInt(storedExpiry, 10)
          : typeof decoded.membershipExpiry === 'number'
            ? decoded.membershipExpiry
            : null;

      const rawDuration = storedDuration !== null ? storedDuration : decoded.membershipDuration;
      const membershipDuration = validMembershipDurations.includes(rawDuration as MembershipDuration)
        ? rawDuration as MembershipDuration
        : null;

      const donationSlug = storedDonationSlug || decoded.donationSlug || null;

      const validatedUser: DecodedToken = {
        id: decoded.id,
        name: decoded.name || '',
        email: decoded.email,
        role: decoded.role,
        exp: decoded.exp,
        membershipType: decoded.membershipType || null,
        displayMembershipType: decoded.displayMembershipType || null,
        membershipStatus,
        membershipExpiry,
        membershipDuration,
        donationSlug,
        country: decoded.country || undefined,
      };

      if (isMounted) {
        setUser(validatedUser);
        localStorage.setItem('membershipStatus', membershipStatus);
        localStorage.setItem('membershipExpiry', membershipExpiry?.toString() || '');
        localStorage.setItem('membershipDuration', membershipDuration || '');
        localStorage.setItem('donationSlug', donationSlug || '');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to authenticate user';
      if (isMounted) {
        toast.error(message, toastConfig.error);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('membershipStatus');
        localStorage.removeItem('membershipExpiry');
        localStorage.removeItem('membershipDuration');
        localStorage.removeItem('donationSlug');
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    loadUserFromToken();
  }, [loadUserFromToken]);

  const hasRole = useCallback((role: string) => user?.role === role, [user]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('membershipStatus');
    localStorage.removeItem('membershipExpiry');
    localStorage.removeItem('membershipDuration');
    localStorage.removeItem('donationSlug');
    setUser(null);
    toast.success('Logged out successfully', toastConfig.success);
    router.push('/Login/Signin');
  }, [router]);

  const updateMembership = useCallback(
    (
      status: MembershipStatus,
      expiry: number,
      duration: MembershipDuration,
      donationSlug: string | null = null,
    ) => {
      if (user) {
        if (!validMembershipStatuses.includes(status)) {
          toast.error(`Invalid membership status: ${status}`, toastConfig.error);
          return;
        }
        if (!validMembershipDurations.includes(duration)) {
          toast.error(`Invalid membership duration: ${duration}`, toastConfig.error);
          return;
        }
        const updatedDonationSlug = donationSlug || user.donationSlug || null;
        setUser({
          ...user,
          membershipStatus: status,
          membershipExpiry: expiry,
          membershipDuration: duration,
          donationSlug: updatedDonationSlug,
        });
        localStorage.setItem('membershipStatus', status);
        localStorage.setItem('membershipExpiry', expiry.toString());
        localStorage.setItem('membershipDuration', duration || '');
        localStorage.setItem('donationSlug', updatedDonationSlug || '');
      }
    },
    [user],
  );

  const contextValue = useMemo(
    () => ({ user, hasRole, logout, loading, updateMembership }),
    [user, hasRole, logout, loading, updateMembership],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};