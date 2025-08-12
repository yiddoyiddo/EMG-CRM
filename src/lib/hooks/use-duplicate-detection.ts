'use client';

import { useState, useCallback } from 'react';
import { DuplicateWarningResult } from '@/components/duplicate-warning-dialog';
import { DuplicateCheckInput } from '@/lib/duplicate-detection';

export interface UseDuplicateDetectionOptions {
  onWarningShown?: (warning: DuplicateWarningResult) => void;
  onDecisionMade?: (decision: 'proceeded' | 'cancelled', warningId?: string) => void;
  debounceMs?: number;
}

export function useDuplicateDetection(options: UseDuplicateDetectionOptions = {}) {
  const [isChecking, setIsChecking] = useState(false);
  const [currentWarning, setCurrentWarning] = useState<DuplicateWarningResult | null>(null);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check for duplicates
  const checkDuplicates = useCallback(async (
    input: DuplicateCheckInput,
    action: string = 'LEAD_CREATE'
  ): Promise<DuplicateWarningResult | null> => {
    if (!input.name && !input.email && !input.company && !input.phone) {
      return null; // Not enough data to check
    }

    setIsChecking(true);
    
    try {
      const response = await fetch('/api/duplicates/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...input,
          action,
        }),
      });

      if (!response.ok) {
        console.error('Duplicate check failed:', response.statusText);
        return null;
      }

      const result: DuplicateWarningResult = await response.json();
      
      if (result.hasWarning) {
        setCurrentWarning(result);
        setIsWarningOpen(true);
        options.onWarningShown?.(result);
      }

      return result;
      
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [options]);

  // Record user decision
  const recordDecision = useCallback(async (
    decision: 'proceeded' | 'cancelled',
    warningId?: string,
    reason?: string
  ): Promise<boolean> => {
    if (!warningId) {
      console.error('Warning ID required to record decision');
      return false;
    }

    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/duplicates/decision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          warningId,
          decision: decision.toUpperCase(),
          reason,
        }),
      });

      if (!response.ok) {
        console.error('Failed to record decision:', response.statusText);
        return false;
      }

      options.onDecisionMade?.(decision, warningId);
      return true;
      
    } catch (error) {
      console.error('Error recording decision:', error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [options]);

  // Handle proceed decision
  const handleProceed = useCallback(async (reason?: string): Promise<boolean> => {
    if (!currentWarning?.warningId) {
      return false;
    }

    const success = await recordDecision('proceeded', currentWarning.warningId, reason);
    
    if (success) {
      setIsWarningOpen(false);
      setCurrentWarning(null);
    }
    
    return success;
  }, [currentWarning, recordDecision]);

  // Handle cancel decision
  const handleCancel = useCallback(async (): Promise<boolean> => {
    if (!currentWarning?.warningId) {
      return false;
    }

    const success = await recordDecision('cancelled', currentWarning.warningId);
    
    if (success) {
      setIsWarningOpen(false);
      setCurrentWarning(null);
    }
    
    return success;
  }, [currentWarning, recordDecision]);

  // Close warning without decision (for modal close)
  const closeWarning = useCallback(() => {
    setIsWarningOpen(false);
    // Don't clear currentWarning to allow reopening
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setCurrentWarning(null);
    setIsWarningOpen(false);
    setIsChecking(false);
    setIsProcessing(false);
  }, []);

  return {
    // State
    isChecking,
    currentWarning,
    isWarningOpen,
    isProcessing,
    
    // Actions
    checkDuplicates,
    handleProceed,
    handleCancel,
    closeWarning,
    reset,
    
    // Utilities
    hasWarning: !!currentWarning?.hasWarning,
    warningId: currentWarning?.warningId,
  };
}