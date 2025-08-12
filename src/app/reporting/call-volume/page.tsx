"use client";

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Heatmap from '@/components/ui/heatmap';
import { downloadCsv } from '@/lib/csv';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Navbar } from '@/components/ui/navbar';

const fetchCallVolume = async (bdr: string, startDate: string, endDate: string) => {
  const params = new URLSearchParams();
  if (bdr && bdr !== 'all') params.append('bdr', bdr);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const res = await fetch(`/api/reporting/call-volume?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch call volume');
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

export default function CallVolumeReport() {
  const [bdr, setBdr] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: callVolume, isLoading: isLoadingCallVolume, error: callVolumeError } = useQuery({
    queryKey: ['callVolume', bdr, startDate, endDate],
    queryFn: () => fetchCallVolume(bdr, startDate, endDate),
  });

  const { data: bdrList, isLoading: isLoadingBdrList, error: bdrListError } = useQuery({
    queryKey: ['bdrList'],
    queryFn: fetchBdrList,
  });

  const handleExport = () => {
    if (!callVolume) return;
    const rows = Object.entries(callVolume.totals).map(([bdr, count]) => ({ BDR: bdr, Calls: count }));
    downloadCsv('call-volume.csv', rows);
  };

  return (
    <>
      <Navbar />
      <Card>
        <CardHeader>
          <CardTitle>Call Volume Report</CardTitle>
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
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-2 border rounded" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="p-2 border rounded" />
        </div>
        {isLoadingCallVolume && <p>Loading...</p>}
        {callVolumeError && <p>Error loading call volume data</p>}
        {callVolume && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button onClick={handleExport} className="text-sm px-3 py-1 border rounded bg-blue-50 hover:bg-blue-100">Export CSV</button>
            </div>
            <Card className="shadow-none border">
              <CardHeader>
                <CardTitle className="text-sm">Total Calls by BDR</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>BDR</TableHead>
                      <TableHead className="text-right">Calls</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(callVolume.totals).map(([name, count]) => (
                      <TableRow key={name}>
                        <TableCell>{name}</TableCell>
                        <TableCell className="text-right">{count as number}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="shadow-none border">
              <CardHeader>
                <CardTitle className="text-sm">Weekly Heatmap</CardTitle>
              </CardHeader>
              <CardContent>
                <Heatmap data={callVolume.heatmap} />
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
} 