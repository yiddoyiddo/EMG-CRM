'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { use } from 'react';

interface PipelineItem {
  id: number;
  name: string;
  company: string;
  status: string;
  partnerListSize?: number;
  children?: PipelineItem[];
}

async function fetchPipelineItem(id: string): Promise<PipelineItem> {
  const res = await fetch(`/api/pipeline/${id}`);
  return res.json();
}

export default function PipelineItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const { data: item } = useQuery({
    queryKey: ['pipelineItem', id],
    queryFn: () => fetchPipelineItem(id),
    enabled: !!id, // Only run query when id is available
  });

  if (!item) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{item.name} - {item.company}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Status:</strong> <Badge>{item.status}</Badge>
            </div>
            <div>
              <strong>Partner List Size:</strong> {item.partnerListSize || 'N/A'}
            </div>
          </div>
        </CardContent>
      </Card>

      {item.children && item.children.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Partner Contacts ({item.children.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {item.children.map((child) => (
                  <TableRow key={child.id}>
                    <TableCell>{child.name}</TableCell>
                    <TableCell>{child.company}</TableCell>
                    <TableCell><Badge>{child.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 