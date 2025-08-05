'use client'
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MondayRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new consolidated reporting page
    router.replace('/reporting/consolidated');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-lg">Redirecting to unified reporting suite...</div>
    </div>
  );
} 