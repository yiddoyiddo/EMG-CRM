'use client';

import { LeadForm } from '@/components/lead-form';
import { useCreateLead, useConvertLeadToPipeline } from '@/lib/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function NewLeadPage() {
  const router = useRouter();
  const { mutate: createLead, isPending } = useCreateLead();
  const { mutate: convertLead } = useConvertLeadToPipeline();
  
  const handleSubmit = (data: any) => {
    createLead(data, {
      onSuccess: () => {
        router.push('/leads');
      }
    });
  };
  
  const handleSaveAndAddToPipeline = (data: any) => {
    createLead(data, {
      onSuccess: (created) => {
        convertLead(
          { leadId: created.id, category: 'Pipeline', status: 'Proposal - Media' },
          { onSuccess: () => router.push('/pipeline') }
        );
      }
    });
  };
  
  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <CardTitle>Create New Lead</CardTitle>
        </CardHeader>
        <CardContent>
          <LeadForm onSubmit={handleSubmit} onSaveAndAddToPipeline={handleSaveAndAddToPipeline} isSubmitting={isPending} />
        </CardContent>
      </Card>
    </div>
  );
} 