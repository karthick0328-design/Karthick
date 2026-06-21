// utils/toastConfig.ts
import type { ToastPosition, IconTheme, ToastOptions } from 'react-hot-toast';
import type { CSSProperties } from 'react';

export const toastConfig = {
  success: {
    duration: 4000,
    position: 'top-right' as ToastPosition,
    style: {
      background: '#10B981',
      color: 'white',
      fontWeight: '500',
    } as CSSProperties,
    iconTheme: {
      primary: 'white',
      secondary: '#10B981',
    } as IconTheme,
  } as Partial<ToastOptions>,
  error: {
    duration: 5000,
    position: 'top-right' as ToastPosition,
    style: {
      background: '#EF4444',
      color: 'white',
      fontWeight: '500',
    } as CSSProperties,
    iconTheme: {
      primary: 'white',
      secondary: '#EF4444',
    } as IconTheme,
  } as Partial<ToastOptions>,
  loading: {
    duration: 3000,
    position: 'top-right' as ToastPosition,
    style: {
      background: '#3B82F6',
      color: 'white',
      fontWeight: '500',
    } as CSSProperties,
    iconTheme: {
      primary: 'white',
      secondary: '#3B82F6',
    } as IconTheme,
  } as Partial<ToastOptions>,
} as const;