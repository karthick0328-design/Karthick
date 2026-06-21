'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Bell } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { toastConfig } from '../../../utils/toastConfig';

interface Notification {
  id: string;
  text: string;
  time: string;
  read: boolean;
}

interface Payment {
  _id: string;
  userId: { email: string; name: string };
  amount: number;
  formatted: string; // Added: Formatted local currency amount from backend
  completedAt: string;
  paymentStatus: 'completed' | 'pending' | 'failed';
  type?: 'donation' | 'membership';
  paymentType?: string;
}

interface DecodedToken {
  name: string;
  email: string;
  role?: string;
  [key: string]: string | number | undefined;
}

export default function NewHeader() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 'initial-1', text: 'New message received from Sarah Johnson', time: '2 mins ago', read: false },
    { id: 'initial-2', text: 'System update available for installation', time: '1 hour ago', read: true },
    { id: 'initial-3', text: 'Monthly report is ready for review', time: '3 hours ago', read: false },
  ]);
  const [processedPaymentIds, setProcessedPaymentIds] = useState<string[]>([]);
  const [admin, setAdmin] = useState<DecodedToken | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded: DecodedToken = jwtDecode(token);
        if (isMounted) {
          setAdmin(decoded);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Invalid or expired token';
        if (isMounted) {
          setError(message);
          toast.error(message, toastConfig.error);
          localStorage.removeItem('token');
          router.push('/Login/Signin');
        }
      }
    } else {
      if (isMounted) {
        setError('No token found');
        toast.error('Please log in', toastConfig.error);
        router.push('/Login/Signin');
      }
    }
    return () => {
      isMounted = false;
    };
  }, [router]);

  const fetchNotifications = useCallback(async () => {
    let isMounted = true;
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        if (isMounted) {
          toast.error('Please log in', toastConfig.error);
          router.push('/Login/Signin');
        }
        return;
      }

      const response = await fetch('http://localhost:5000/api/payment/admin/history?page=1&limit=5', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          throw new Error('Unauthorized: Invalid or missing token');
        } else if (response.status === 403) {
          throw new Error('Forbidden: Admin access required');
        }
        throw new Error(errorData.message || 'Failed to fetch payment history');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch payment history');
      }

      const newPayments = data.payments
        .filter((payment: Payment) => payment.paymentStatus === 'completed' && !processedPaymentIds.includes(payment._id))
        .map((payment: Payment) => ({
          id: `payment-${payment._id}`,
          text: `New ${payment.type || (payment.paymentType === 'donation' ? 'donation' : 'membership')} of ${payment.formatted} from ${payment.userId.name}`,
          time: new Date(payment.completedAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          read: false,
        }));

      if (newPayments.length > 0 && isMounted) {
        setNotifications((prev) => [...newPayments, ...prev.slice(0, 8 - newPayments.length)]);
        setProcessedPaymentIds((prev) => [...new Set([...prev, ...newPayments.map((n: Notification) => n.id.replace('payment-', ''))])]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch notifications';
      if (isMounted) {
        toast.error(message, toastConfig.error);
        if (message.includes('Unauthorized') || message.includes('Forbidden')) {
          router.push('/Login/Signin');
        }
      }
    }
    return () => {
      isMounted = false;
    };
  }, [processedPaymentIds, router]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markNotificationAsRead = useCallback(
    (id: string) => {
      setNotifications((prev) =>
        prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
      );
    },
    [],
  );

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
  }, []);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const getInitial = useCallback(() => {
    if (admin?.name) {
      return admin.name.charAt(0).toUpperCase();
    }
    return '?';
  }, [admin]);

  // Deduplicate notifications by ID before rendering to prevent React key warnings
  const uniqueNotifications = useMemo(() => {
    const seen = new Map();
    return notifications.filter((notification) => {
      if (seen.has(notification.id)) {
        return false;
      }
      seen.set(notification.id, true);
      return true;
    });
  }, [notifications]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0 flex items-center space-x-2">
            <Image
              src="/Tansci.jpg"
              alt="TamSci Logo"
              width={150}
              height={100}
              className="object-contain fixed left-3"
            />
            <span className="text-xl font-bold text-gray-800"></span>
          </div>

          <div className="flex items-center fixed right-3">
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-200"
                aria-label="Toggle notifications"
                aria-expanded={notificationsOpen}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-blue-500 text-xs text-white font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10 overflow-hidden">
                  <div className="py-1">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold text-gray-800">Notifications</p>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800"
                            aria-label="Mark all notifications as read"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {uniqueNotifications.length > 0 ? (
                        uniqueNotifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-l-2 ${notification.read ? 'border-transparent' : 'border-blue-500'
                              }`}
                            onClick={() => markNotificationAsRead(notification.id)}
                            role="button"
                            tabIndex={0}
                            aria-label={`Notification: ${notification.text}`}
                          >
                            <p className="text-sm text-gray-800">{notification.text}</p>
                            <p className="text-xs text-gray-500 mt-1 flex items-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1.5"></span>
                              {notification.time}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="px-4 py-3 text-sm text-gray-600 text-center">No new notifications</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-gray-300 mx-1"></div>

            <div className="relative">
              <button
                className="flex items-center space-x-2 focus:outline-none group"
                aria-label={`User profile: ${admin?.name || 'Admin'}`}
              >
                <div className="relative">
                  <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-medium text-lg ring-2 ring-gray-200 group-hover:ring-blue-300 transition-all">
                    {getInitial()}
                  </div>
                  <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-blue-500 border-2 border-white"></span>
                </div>
                <div className="hidden md:block text-left">
                  {error ? (
                    <p className="text-sm font-medium text-blue-600">{error}</p>
                  ) : admin ? (
                    <>
                      <p className="text-sm font-medium text-gray-800">{admin.name || 'Admin'}</p>
                      <p className="text-xs text-gray-500">{admin.role || 'Administrator'}</p>
                    </>
                  ) : (
                    <p className="text-sm font-medium text-gray-800">Loading...</p>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}