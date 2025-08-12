'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  AlertTriangle, 
  Building2, 
  Mail, 
  Phone, 
  User, 
  Calendar, 
  ExternalLink,
  Clock,
  AlertCircle
} from 'lucide-react';
import { WarningSeverity, DuplicateType } from '@prisma/client';

export interface DuplicateMatch {
  id: string;
  matchType: DuplicateType;
  confidence: number;
  severity: WarningSeverity;
  matchDetails: {
    type: 'exact' | 'similar';
    field: string;
  };
  existingRecord: {
    type: 'lead' | 'pipeline' | 'company' | 'contact';
    company?: string;
    lastContactDate?: string;
    status?: string;
    isActive?: boolean;
    owner?: {
      name?: string;
    };
  };
}

export interface DuplicateWarningResult {
  hasWarning: boolean;
  severity: WarningSeverity;
  warningId?: string;
  message?: string;
  matches: DuplicateMatch[];
}

interface DuplicateWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: (reason?: string) => void;
  onCancel: () => void;
  warning: DuplicateWarningResult;
  isProcessing?: boolean;
}

export function DuplicateWarningDialog({
  isOpen,
  onClose,
  onProceed,
  onCancel,
  warning,
  isProcessing = false,
}: DuplicateWarningDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [reason, setReason] = useState('');
  const [showReason, setShowReason] = useState(false);

  const handleProceed = () => {
    onProceed(reason.trim() || undefined);
    resetState();
  };

  const handleCancel = () => {
    onCancel();
    resetState();
  };

  const handleClose = () => {
    onClose();
    resetState();
  };

  const resetState = () => {
    setAcknowledged(false);
    setReason('');
    setShowReason(false);
  };

  const getSeverityIcon = (severity: WarningSeverity) => {
    switch (severity) {
      case WarningSeverity.CRITICAL:
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case WarningSeverity.HIGH:
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case WarningSeverity.MEDIUM:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: WarningSeverity) => {
    switch (severity) {
      case WarningSeverity.CRITICAL:
        return 'destructive';
      case WarningSeverity.HIGH:
        return 'destructive';
      case WarningSeverity.MEDIUM:
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getMatchTypeIcon = (matchType: DuplicateType) => {
    switch (matchType) {
      case DuplicateType.COMPANY_NAME:
      case DuplicateType.COMPANY_DOMAIN:
        return <Building2 className="h-4 w-4" />;
      case DuplicateType.CONTACT_EMAIL:
        return <Mail className="h-4 w-4" />;
      case DuplicateType.CONTACT_PHONE:
        return <Phone className="h-4 w-4" />;
      case DuplicateType.CONTACT_NAME:
        return <User className="h-4 w-4" />;
      case DuplicateType.LINKEDIN_PROFILE:
        return <ExternalLink className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const formatMatchType = (matchType: DuplicateType) => {
    return matchType
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
    
    return `${Math.floor(diffInSeconds / 31536000)} years ago`;
  };

  const highPriorityMatches = warning.matches.filter(m => 
    m.severity === WarningSeverity.CRITICAL || m.severity === WarningSeverity.HIGH
  );
  
  const mediumPriorityMatches = warning.matches.filter(m => 
    m.severity === WarningSeverity.MEDIUM
  );

  const shouldShowReason = warning.severity === WarningSeverity.CRITICAL || 
                          warning.severity === WarningSeverity.HIGH ||
                          highPriorityMatches.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {getSeverityIcon(warning.severity)}
            Potential Duplicate Detected
          </DialogTitle>
          <DialogDescription className="text-base">
            {warning.message || 
             `We found ${warning.matches.length} potential duplicate(s) in the system. Please review before proceeding.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* High Priority Matches */}
          {highPriorityMatches.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                High Priority Conflicts ({highPriorityMatches.length})
              </h3>
              <div className="space-y-3">
                {highPriorityMatches.map((match) => (
                  <Card key={match.id} className="border-red-200 dark:border-red-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getMatchTypeIcon(match.matchType)}
                          {formatMatchType(match.matchType)} Match
                        </div>
                        <Badge variant={getSeverityColor(match.severity)}>
                          {match.severity}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <Label className="text-xs text-muted-foreground">Company</Label>
                          <p className="font-medium">{match.existingRecord.company || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Last Contact</Label>
                          <p className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(match.existingRecord.lastContactDate)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Owner</Label>
                          <p>{match.existingRecord.owner?.name || 'Unknown'}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {match.existingRecord.type.toUpperCase()}
                          </Badge>
                          <Badge 
                            variant={match.existingRecord.isActive ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {match.existingRecord.status || 'Unknown Status'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Math.round(match.confidence * 100)}% match confidence
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Medium Priority Matches */}
          {mediumPriorityMatches.length > 0 && (
            <div>
              {highPriorityMatches.length > 0 && <Separator />}
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Additional Matches ({mediumPriorityMatches.length})
              </h3>
              <div className="space-y-2">
                {mediumPriorityMatches.map((match) => (
                  <Card key={match.id} className="border-yellow-200 dark:border-yellow-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getMatchTypeIcon(match.matchType)}
                          <div>
                            <p className="text-sm font-medium">
                              {formatMatchType(match.matchType)} - {match.existingRecord.company || 'Unknown Company'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Last contact: {formatTimeAgo(match.existingRecord.lastContactDate)} by {match.existingRecord.owner?.name || 'Unknown'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {Math.round(match.confidence * 100)}%
                          </Badge>
                          <Badge variant={getSeverityColor(match.severity)} className="text-xs">
                            {match.severity}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Acknowledgment and Reason */}
          <Separator />
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="acknowledge"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked as boolean)}
              />
              <Label htmlFor="acknowledge" className="text-sm">
                I understand these may be duplicates and want to proceed anyway
              </Label>
            </div>

            {(shouldShowReason || showReason) && (
              <div>
                <Label htmlFor="reason" className="text-sm font-medium">
                  Reason for proceeding {shouldShowReason && <span className="text-red-500">*</span>}
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Please explain why you're proceeding despite potential duplicates..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-2"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This will be logged for audit purposes.
                </p>
              </div>
            )}

            {!shouldShowReason && !showReason && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReason(true)}
                className="text-muted-foreground"
              >
                Add reason (optional)
              </Button>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex flex-1 justify-start">
            <p className="text-xs text-muted-foreground">
              This decision will be logged for audit trail and analytics.
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleProceed}
              disabled={
                !acknowledged || 
                (shouldShowReason && !reason.trim()) ||
                isProcessing
              }
              className="min-w-[120px]"
            >
              {isProcessing ? 'Processing...' : 'Proceed Anyway'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}