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
    <div className="w-full max-w-6xl mx-auto py-10 px-4">
      <Card className="shadow-lg border-0 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm">
        <CardHeader className="pb-8 text-center border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
          <CardTitle className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Create New Lead
          </CardTitle>
          <p className="text-gray-600 dark:text-gray-300 mt-2 text-lg">
            Add a new lead to your sales pipeline with comprehensive contact and scheduling information
          </p>
        </CardHeader>
        <CardContent className="p-8">
          <LeadForm onSubmit={handleSubmit} onSaveAndAddToPipeline={handleSaveAndAddToPipeline} isSubmitting={isPending} />
        </CardContent>
      </Card>
    </div>
  );
} 