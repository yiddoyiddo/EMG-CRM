'use client';

import { useLead, useDeleteLead } from '@/lib/hooks';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateUK } from '@/lib/date-utils';
import { toast } from 'sonner';
import { LeadToPipelineDialog } from '@/components/lead-to-pipeline-dialog';
import { LeadUpdatesDialog } from '@/components/lead-updates-dialog';
import { use } from 'react';

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const leadId = Number(id);
  
  const { data: lead, isLoading, isError } = useLead(leadId);
  const { mutate: deleteLead, isPending } = useDeleteLead();
  
  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this lead?')) {
      deleteLead(leadId, {
        onSuccess: () => {
          router.push('/leads');
        }
      });
    }
  };
  
  if (isLoading) {
    return (
      <div className="container py-10">
        <Card>
          <CardContent className="p-10 text-center">
            Loading lead...
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (isError || !lead) {
    return (
      <div className="container py-10">
        <Card>
          <CardContent className="p-10 text-center">
            Lead not found or error loading data.
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">{lead.name}</CardTitle>
              {lead.title && <CardDescription>{lead.title}</CardDescription>}
            </div>
            <div className="flex items-center gap-2">
              {lead.bdr && (
                <LeadToPipelineDialog 
                  lead={lead}
                  onSuccess={() => {
                    toast.success(`${lead.name} moved to pipeline successfully`);
                  }}
                />
              )}
              <Button
                variant="outline"
                onClick={() => router.push('/leads')}
              >
                Back to Leads
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Company</h3>
              <p>{lead.company || 'Not specified'}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">BDR Owner</h3>
              <p>{lead.bdr || 'Not assigned'}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
              <p>{lead.email || 'Not available'}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Phone</h3>
              <p>{lead.phone || 'Not available'}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Source</h3>
              <p>{lead.source}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
              <p>{lead.status}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Date Added</h3>
              <p>{formatDateUK(lead.addedDate)}</p>
            </div>
            {lead.link && (
              <div className="space-y-2 md:col-span-2">
                <h3 className="text-sm font-medium text-muted-foreground">Profile Link</h3>
                <p>
                  <a href={lead.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    {lead.link}
                  </a>
                </p>
              </div>
            )}
            {lead.notes && (
              <div className="space-y-2 md:col-span-2">
                <h3 className="text-sm font-medium text-muted-foreground">Notes</h3>
                <p>{lead.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/leads/${leadId}/edit`)}
            >
              Edit
            </Button>
            <LeadUpdatesDialog lead={lead} />
          </div>
          <div className="flex gap-2">
            <LeadToPipelineDialog lead={lead} />
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              Delete
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 