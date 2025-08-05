"use client";

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ReportingFilters from '@/components/ui/reporting-filters';
import { useReportingFilters } from '@/context/ReportingFiltersContext';
import { downloadCsv } from '@/lib/csv';
import { Navbar } from '@/components/ui/navbar';
import { ResponsiveFunnelChart } from '@/components/ui/funnel-chart';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ef4444'];

async function fetchConversion(bdr: string) {
  const params = new URLSearchParams();
  if (bdr && bdr !== 'all') params.append('bdr', bdr);
  const res = await fetch(`/api/reporting/conversion?${params.toString()}`);
  return res.json();
}

export default function ConversionReport() {
  const { filters } = useReportingFilters();
  const { data } = useQuery({ queryKey: ['conversion', filters.bdr], queryFn: () => fetchConversion(filters.bdr) });

  const handleExport = () => {
    if (!data) return;
    const rows = [
      { Stage: 'Calls', Count: data.callsConducted },
      { Stage: 'Proposals', Count: data.proposalsSent },
      { Stage: 'Agreements', Count: data.agreementsSigned },
      { Stage: 'Lists Out', Count: data.listsSent },
      { Stage: 'Sales', Count: data.sales },
    ];
    downloadCsv('conversion-funnel.csv', rows);
  };

  const funnelData = data
    ? [
        { name: 'Calls', value: data.callsConducted, color: COLORS[0] },
        { name: 'Proposals', value: data.proposalsSent, color: COLORS[1] },
        { name: 'Agreements', value: data.agreementsSigned, color: COLORS[2] },
        { name: 'Lists Out', value: data.listsSent, color: COLORS[3] },
        { name: 'Sales', value: data.sales, color: COLORS[4] },
      ]
    : [];

  return (
    <>
      <Navbar />
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>
            Sales pipeline progression showing lead volume and conversion rates at each stage
          </CardDescription>
          <ReportingFilters />
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <button 
              onClick={handleExport} 
              className="text-sm px-3 py-1 border rounded bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 dark:border-blue-800"
            >
              Export CSV
            </button>
          </div>
          {data ? (
            <ResponsiveFunnelChart data={funnelData} />
          ) : (
            <div className="flex items-center justify-center h-96">
              <p className="text-muted-foreground">Loading conversion data...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
} 