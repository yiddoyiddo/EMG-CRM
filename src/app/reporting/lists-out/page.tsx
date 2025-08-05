"use client";

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { downloadCsv } from '@/lib/csv';
import { Navbar } from '@/components/ui/navbar';

const fetchListsOut = async (bdr: string, months: number) => {
  const params = new URLSearchParams();
  if (bdr && bdr !== 'all') params.append('bdr', bdr);
  params.append('months', months.toString());

  const res = await fetch(`/api/reporting/lists-out?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch lists out');
  return res.json();
};

const fetchBdrList = async () => {
  const response = await fetch('/api/reporting/executive-dashboard');
  if (!response.ok) {
    throw new Error('Failed to fetch BDR list');
  }
  const data = await response.json();
  return data.dashboard.bdrList;
}

export default function ListsOutReport() {
  const [bdr, setBdr] = useState('all');
  const [months, setMonths] = useState(4);

  const { data: listsOut, isLoading: isLoadingListsOut, error: listsOutError } = useQuery({
    queryKey: ['listsOut', bdr, months],
    queryFn: () => fetchListsOut(bdr, months),
  });

  const { data: bdrList, isLoading: isLoadingBdrList, error: bdrListError } = useQuery({
    queryKey: ['bdrList'],
    queryFn: fetchBdrList,
  });

  const handleExport = () => {
    if (!listsOut) return;
    const rows = listsOut.monthly.map((m: any) => ({ Month: m.month, Lists: m.lists, AvgSize: m.avgSize }));
    downloadCsv('lists-out.csv', rows);
  };

  return (
    <>
      <Navbar />
      <Card>
        <CardHeader>
          <CardTitle>Lists Out Report</CardTitle>
        </CardHeader>
      <CardContent>
        <div className="flex space-x-4 mb-4">
          <Select onValueChange={setBdr} value={bdr}>
            <SelectTrigger>
              <SelectValue placeholder="Select BDR" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All BDRs</SelectItem>
              {bdrList?.map((bdr: string) => (
                <SelectItem key={bdr} value={bdr}>{bdr}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={months.toString()} onValueChange={(v) => setMonths(parseInt(v, 10))}>
            <SelectTrigger>
              <SelectValue placeholder="Months" />
            </SelectTrigger>
            <SelectContent>
              {[1,3,4,6,12].map((m) => (
                <SelectItem key={m} value={m.toString()}>Last {m} {m===1?'Month':'Months'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isLoadingListsOut && <p>Loading...</p>}
        {listsOutError && <p>Error loading lists out data</p>}
        {listsOut && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button onClick={handleExport} className="text-sm px-3 py-1 border rounded bg-blue-50 hover:bg-blue-100">Export CSV</button>
            </div>
            <Card className="shadow-none border">
              <CardHeader>
                <CardTitle className="text-sm">Monthly Lists-Out</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Lists Sent</TableHead>
                      <TableHead className="text-right">Avg Size</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listsOut.monthly.map((m: any) => (
                      <TableRow key={m.month}>
                        <TableCell>{m.month}</TableCell>
                        <TableCell className="text-right">{m.lists}</TableCell>
                        <TableCell className="text-right">{m.avgSize}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="shadow-none border">
              <CardHeader>
                <CardTitle className="text-sm">Overall Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Total Lists Out: <strong>{listsOut.overall.totalLists}</strong></p>
                <p>Average List Size: <strong>{listsOut.overall.averageSize}</strong></p>
                <p>Conversion Rate (Sold): <strong>{listsOut.overall.conversionRate}%</strong></p>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
} 