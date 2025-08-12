'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface Target { name: string; value: number; }

async function fetchTargets(): Promise<Target[]> {
  const res = await fetch('/api/kpi-targets');
  return res.json();
}

async function saveTargets(data: Target[]) {
  const res = await fetch('/api/kpi-targets', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export default function KpiTargetsAdmin() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['kpiTargets'], queryFn: fetchTargets });
  const [editable, setEditable] = useState<Record<string, number>>({});

  const mutation = useMutation({
    mutationFn: saveTargets,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kpiTargets'] }),
  });

  const handleSave = () => {
    const payload = data.map((t) => ({ name: t.name, value: editable[t.name] ?? t.value }));
    mutation.mutate(payload);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>KPI Target Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead>Target</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((t) => (
              <TableRow key={t.name}>
                <TableCell>{t.name}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    className="w-32"
                    defaultValue={t.value}
                    onChange={(e) =>
                      setEditable((prev) => ({ ...prev, [t.name]: parseInt(e.target.value, 10) }))
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button className="mt-4" onClick={handleSave} disabled={mutation.isPending}>
          Save
        </Button>
      </CardContent>
    </Card>
  );
} 