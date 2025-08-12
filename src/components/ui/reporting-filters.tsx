"use client";

import React from 'react';
import { useReportingFilters } from '@/context/ReportingFiltersContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { useQuery } from '@tanstack/react-query';

async function fetchBdrList() {
  const res = await fetch('/api/reporting/executive-dashboard');
  const json = await res.json();
  return json.dashboard.bdrList as string[];
}

export default function ReportingFilters() {
  const { filters, setFilters } = useReportingFilters();

  const { data: bdrList = [] } = useQuery({ queryKey: ['bdrList'], queryFn: fetchBdrList });

  return (
    <div className="flex space-x-4">
      <Select
        value={filters.bdr}
        onValueChange={(v) => setFilters((prev) => ({ ...prev, bdr: v }))}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="BDR" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All BDRs</SelectItem>
          {bdrList.map((b) => (
            <SelectItem key={b} value={b}>
              {b}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.months.toString()}
        onValueChange={(v) => setFilters((prev) => ({ ...prev, months: parseInt(v, 10) }))}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Months" />
        </SelectTrigger>
        <SelectContent>
          {[1, 3, 4, 6, 12].map((m) => (
            <SelectItem key={m} value={m.toString()}>
              Last {m} {m === 1 ? 'Month' : 'Months'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 