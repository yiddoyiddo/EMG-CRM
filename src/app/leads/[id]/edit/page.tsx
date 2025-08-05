'use client';

import { useState, useEffect } from 'react';
import { LeadForm } from '@/components/lead-form';
import { useLead, useUpdateLead } from '@/lib/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { use } from 'react';

export default function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const leadId = Number(id);
  
  const { data: lead, isLoading: isLoadingLead, isError } = useLead(leadId);
  const { mutate: updateLead, isPending } = useUpdateLead();
  
  const handleSubmit = (data: any) => {
    updateLead(data, {
      onSuccess: () => {
        router.push('/leads');
      }
    });
  };
  
  if (isLoadingLead) {
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
          <CardTitle>Edit Lead: {lead.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <LeadForm 
            lead={lead} 
            onSubmit={handleSubmit} 
            isSubmitting={isPending} 
          />
        </CardContent>
      </Card>
    </div>
  );
} 