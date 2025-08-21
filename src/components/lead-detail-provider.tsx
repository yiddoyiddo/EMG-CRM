'use client';

import React, { createContext, useContext, useState } from 'react';
import { LeadDetail } from './lead-detail';

interface LeadDetailContextType {
  openLeadDetail: (leadId: number) => void;
  closeLeadDetail: () => void;
}

const LeadDetailContext = createContext<LeadDetailContextType | null>(null);

export function useLeadDetailDialog() {
  const context = useContext(LeadDetailContext);
  if (!context) {
    // Return a no-op implementation for SSR or when used outside provider
    return {
      openLeadDetail: () => {},
      closeLeadDetail: () => {},
    };
  }
  return context;
}

interface LeadDetailProviderProps {
  children: React.ReactNode;
}

export function LeadDetailProvider({ children }: LeadDetailProviderProps) {
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openLeadDetail = (leadId: number) => {
    setSelectedLeadId(leadId);
    setIsOpen(true);
  };

  const closeLeadDetail = () => {
    setIsOpen(false);
    setSelectedLeadId(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeLeadDetail();
    } else {
      setIsOpen(true);
    }
  };

  return (
    <LeadDetailContext.Provider
      value={{
        openLeadDetail,
        closeLeadDetail,
      }}
    >
      {children}
      {selectedLeadId && (
        <LeadDetail
          leadId={selectedLeadId}
          open={isOpen}
          onOpenChange={handleOpenChange}
        />
      )}
    </LeadDetailContext.Provider>
  );
}