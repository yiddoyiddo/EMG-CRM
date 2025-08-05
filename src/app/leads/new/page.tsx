'use client';

import { LeadForm } from '@/components/lead-form';
import { useCreateLead } from '@/lib/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function NewLeadPage() {
  const router = useRouter();
  const { mutate: createLead, isPending } = useCreateLead();
  
  const handleSubmit = (data: any) => {
    createLead(data, {
      onSuccess: () => {
        router.push('/leads');
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
          <LeadForm onSubmit={handleSubmit} isSubmitting={isPending} />
        </CardContent>
      </Card>
    </div>
  );
} 