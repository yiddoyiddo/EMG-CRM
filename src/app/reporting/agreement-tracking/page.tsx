"use client";

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { downloadCsv } from '@/lib/csv';
import { Navbar } from '@/components/ui/navbar';

const fetchAgreementTracking = async (bdr: string, months: number) => {
  const params = new URLSearchParams();
  if (bdr && bdr !== 'all') params.append('bdr', bdr);
  params.append('months', months.toString());

  const res = await fetch(`/api/reporting/agreement-tracking?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch agreement tracking');
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

export default function AgreementTrackingReport() {
  const [bdr, setBdr] = useState('all');
  const [months, setMonths] = useState(4);

  const { data: agreementTracking, isLoading: isLoadingAgreementTracking, error: agreementTrackingError } = useQuery({
    queryKey: ['agreementTracking', bdr, months],
    queryFn: () => fetchAgreementTracking(bdr, months),
  });

  const { data: bdrList, isLoading: isLoadingBdrList, error: bdrListError } = useQuery({
    queryKey: ['bdrList'],
    queryFn: fetchBdrList,
  });

  const handleExport = () => {
    if (!agreementTracking) return;
    const rows = agreementTracking.monthly.map((m: any) => ({ Month: m.month, Agreements: m.count }));
    downloadCsv('agreements.csv', rows);
  };

  return (
    <>
      <Navbar />
      <Card>
        <CardHeader>
          <CardTitle>Agreement Tracking Report</CardTitle>
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
        {isLoadingAgreementTracking && <p>Loading...</p>}
        {agreementTrackingError && <p>Error loading agreement tracking data</p>}
        {agreementTracking && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button onClick={handleExport} className="text-sm px-3 py-1 border rounded bg-blue-50 hover:bg-blue-100">Export CSV</button>
            </div>
            <Card className="shadow-none border">
              <CardHeader>
                <CardTitle className="text-sm">Monthly Agreements</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Agreements</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agreementTracking.monthly.map((m: any) => (
                      <TableRow key={m.month}>
                        <TableCell>{m.month}</TableCell>
                        <TableCell className="text-right">{m.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="shadow-none border">
              <CardHeader>
                <CardTitle className="text-sm">Agreements by BDR</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>BDR</TableHead>
                      <TableHead className="text-right">Agreements</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(agreementTracking.byBdr).map(([name, count]) => (
                      <TableRow key={name}>
                        <TableCell>{name}</TableCell>
                        <TableCell className="text-right">{count as number}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
} 