'use client';

import React from 'react';
import { AppProvider } from '@/contexts/AppContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ToastContainer } from '@/components/ui/Toast';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <ToastProvider>
        <DashboardLayout>
          {children}
        </DashboardLayout>
        <ToastContainer />
      </ToastProvider>
    </AppProvider>
  );
}
