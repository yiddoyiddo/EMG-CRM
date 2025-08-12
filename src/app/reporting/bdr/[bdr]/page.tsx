'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/ui/navbar';
import { use } from 'react';

const fetchBdrPerformance = async (bdr: string, startDate: string, endDate: string) => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await fetch(`/api/reporting/bdr/${bdr}?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch BDR performance');
  }
  return response.json();
};

// Next.js App Router passes params synchronously; do not use Promise/use() here
export default function BdrPerformanceReport({ params }: { params: { bdr: string } }) {
  const { bdr } = params;
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: bdrPerformance, isLoading: isLoadingBdrPerformance, error: bdrPerformanceError } = useQuery({
    queryKey: ['bdrPerformance', bdr, startDate, endDate],
    queryFn: () => fetchBdrPerformance(bdr, startDate, endDate),
    enabled: !!bdr,
  });

  return (
    <>
      <Navbar />
      <Card>
        <CardHeader>
          <CardTitle>BDR Performance Report: {bdr}</CardTitle>
        </CardHeader>
      <CardContent>
        <div className="flex space-x-4 mb-4">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-2 border rounded" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="p-2 border rounded" />
        </div>
        {isLoadingBdrPerformance && <p>Loading...</p>}
        {bdrPerformanceError && <p>Error loading BDR performance data</p>}
        {bdrPerformance && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activity Type</TableHead>
                <TableHead>Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bdrPerformance.map((row: any) => (
                <TableRow key={row.activityType}>
                  <TableCell>{row.activityType}</TableCell>
                  <TableCell>{row._count._all}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
    </>
  );
} 