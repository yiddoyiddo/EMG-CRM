"use client";

import React, { createContext, useContext, useState } from 'react';

interface Filters {
  bdr: string;
  startDate: string; // ISO yyyy-mm-dd
  endDate: string;
  months: number;
}

const defaultFilters: Filters = {
  bdr: 'all',
  startDate: '',
  endDate: '',
  months: 4,
};

interface ReportingFiltersContextProps {
  filters: Filters;
  setFilters: (fn: (prev: Filters) => Filters) => void;
}

const ReportingFiltersContext = createContext<ReportingFiltersContextProps | undefined>(
  undefined,
);

export const ReportingFiltersProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [filters, _setFilters] = useState<Filters>(defaultFilters);
  const setFilters = (fn: (prev: Filters) => Filters) => _setFilters((prev) => fn(prev));

  return (
    <ReportingFiltersContext.Provider value={{ filters, setFilters }}>
      {children}
    </ReportingFiltersContext.Provider>
  );
};

export function useReportingFilters() {
  const ctx = useContext(ReportingFiltersContext);
  if (!ctx) throw new Error('useReportingFilters must be used within ReportingFiltersProvider');
  return ctx;
} 