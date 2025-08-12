'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactQueryProvider } from '@/lib/react-query';
import { ReportingFiltersProvider } from '@/context/ReportingFiltersContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ReactQueryProvider>
        <ReportingFiltersProvider>
          {children}
        </ReportingFiltersProvider>
      </ReactQueryProvider>
    </SessionProvider>
  );
}