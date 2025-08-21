'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { financeStatusEnum, leadBdrEnum } from '@/lib/validations';
import { formatDateForInput } from '@/lib/date-utils';
import { toast } from 'sonner';
import { exchangeRateService } from '@/lib/exchange-rate';

interface FinanceEntry {
  id?: number;
  company: string;
  bdr: string;
  leadGen: boolean;
  status: string;
  invoiceDate: Date | null;
  dueDate: Date | null;
  soldAmount: number | null;
  gbpAmount: number | null;
  exchangeRate: number | null;
  exchangeRateDate: Date | null;
  actualGbpReceived: number | null;
  notes: string | null;
  commissionPaid: boolean;
  danCommissionPaid: boolean;
  bdrCommissionAmount: number | null;
  danCommissionAmount: number | null;
  isMarkCawstonLead: boolean;
  month: string;
}

interface FinanceFormProps {
  entry?: FinanceEntry;
  onSubmit: (data: Omit<FinanceEntry, 'id'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function FinanceForm({ entry, onSubmit, onCancel, isLoading }: FinanceFormProps) {
  const [formData, setFormData] = useState<Omit<FinanceEntry, 'id'>>({
    company: entry?.company || '',
    bdr: entry?.bdr || '',
    leadGen: entry?.leadGen || false,
    status: entry?.status || 'Awaiting Invoice',
    invoiceDate: entry?.invoiceDate || null,
    dueDate: entry?.dueDate || null,
    soldAmount: entry?.soldAmount || null,
    gbpAmount: entry?.gbpAmount || null,
    exchangeRate: entry?.exchangeRate || null,
    exchangeRateDate: entry?.exchangeRateDate || null,
    actualGbpReceived: entry?.actualGbpReceived || null,
    notes: entry?.notes || null,
    commissionPaid: entry?.commissionPaid || false,
    danCommissionPaid: entry?.danCommissionPaid || false,
    bdrCommissionAmount: entry?.bdrCommissionAmount || null,
    danCommissionAmount: entry?.danCommissionAmount || null,
    isMarkCawstonLead: entry?.isMarkCawstonLead || (entry?.bdr === 'Mark Cawston'),
    month: entry?.month || '2025-01',
  });

  const [isConverting, setIsConverting] = useState(false);
  const [exchangeRateInfo, setExchangeRateInfo] = useState<string>('');

  // Auto-convert USD to GBP when sold amount changes
  useEffect(() => {
    const convertUSDToGBP = async () => {
      if (formData.soldAmount && formData.soldAmount > 0) {
        // Only auto-convert if this is a new entry or if GBP amount is empty
        if (!entry || !formData.gbpAmount) {
          setIsConverting(true);
          try {
            const rate = await exchangeRateService.getCurrentRate();
            const gbpAmount = exchangeRateService.convertUSDToGBP(formData.soldAmount, rate);
            
            setFormData(prev => ({
              ...prev,
              gbpAmount,
              exchangeRate: rate,
              exchangeRateDate: new Date()
            }));
            
            setExchangeRateInfo(`Converted at rate: $1 = £${rate.toFixed(4)}`);
          } catch (error) {
            console.error('Error converting currency:', error);
            toast.error('Failed to convert currency. Please enter GBP amount manually.');
          } finally {
            setIsConverting(false);
          }
        }
      }
    };

    convertUSDToGBP();
  }, [formData.soldAmount, entry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.company.trim()) {
      toast.error('Company is required');
      return;
    }
    
    if (!formData.bdr) {
      toast.error('BDR is required');
      return;
    }
    
    onSubmit(formData);
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="company">Company *</Label>
          <Input
            id="company"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            placeholder="Enter company name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bdr">BDR *</Label>
          <Select value={formData.bdr} onValueChange={(value) => setFormData({ 
            ...formData, 
            bdr: value,
            isMarkCawstonLead: value === 'Mark Cawston'
          })}>
            <SelectTrigger>
              <SelectValue placeholder="Select BDR" />
            </SelectTrigger>
            <SelectContent>
              {leadBdrEnum.map((bdr) => (
                <SelectItem key={bdr} value={bdr}>
                  {bdr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="month">Month *</Label>
          <Select value={formData.month} onValueChange={(value) => setFormData({ ...formData, month: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025-01">January 2025</SelectItem>
              <SelectItem value="2025-02">February 2025</SelectItem>
              <SelectItem value="2025-03">March 2025</SelectItem>
              <SelectItem value="2025-04">April 2025</SelectItem>
              <SelectItem value="2025-05">May 2025</SelectItem>
              <SelectItem value="2025-06">June 2025</SelectItem>
              <SelectItem value="2025-07">July 2025</SelectItem>
              <SelectItem value="2025-08">August 2025</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status *</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {financeStatusEnum.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="soldAmount">Sold Amount</Label>
          <Input
            id="soldAmount"
            type="number"
            step="0.01"
            value={formData.soldAmount || ''}
            onChange={(e) => setFormData({ 
              ...formData, 
              soldAmount: e.target.value ? parseFloat(e.target.value) : null 
            })}
            placeholder="Enter sold amount"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gbpAmount">
            GBP Amount
            {exchangeRateInfo && (
              <span className="text-xs text-gray-500 ml-2">({exchangeRateInfo})</span>
            )}
          </Label>
          <Input
            id="gbpAmount"
            type="number"
            step="0.01"
            value={formData.gbpAmount || ''}
            onChange={(e) => {
              const newGbpAmount = e.target.value ? parseFloat(e.target.value) : null;
              setFormData({ 
                ...formData, 
                gbpAmount: newGbpAmount,
                // Clear exchange rate info if manually edited
                exchangeRate: newGbpAmount ? formData.exchangeRate : null,
                exchangeRateDate: newGbpAmount ? formData.exchangeRateDate : null
              });
              if (newGbpAmount) {
                setExchangeRateInfo('Manually entered');
              }
            }}
            placeholder={isConverting ? "Converting..." : "Enter GBP amount"}
            disabled={isConverting}
          />
          {entry && formData.exchangeRate && (
            <p className="text-xs text-gray-500">
              Historical rate: $1 = £{formData.exchangeRate.toFixed(4)} 
              ({formData.exchangeRateDate ? new Date(formData.exchangeRateDate).toLocaleDateString() : 'N/A'})
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="actualGbpReceived">Actual GBP Received</Label>
          <Input
            id="actualGbpReceived"
            type="number"
            step="0.01"
            value={formData.actualGbpReceived || ''}
            onChange={(e) => setFormData({ 
              ...formData, 
              actualGbpReceived: e.target.value ? parseFloat(e.target.value) : null 
            })}
            placeholder="Enter actual GBP received"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoiceDate">Invoice Date</Label>
          <Input
            id="invoiceDate"
            type="date"
            value={formatDateForInput(formData.invoiceDate)}
            onChange={(e) => setFormData({ 
              ...formData, 
              invoiceDate: e.target.value ? new Date(e.target.value) : null 
            })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            id="dueDate"
            type="date"
            value={formatDateForInput(formData.dueDate)}
            onChange={(e) => setFormData({ 
              ...formData, 
              dueDate: e.target.value ? new Date(e.target.value) : null 
            })}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="leadGen"
          checked={formData.leadGen}
          onCheckedChange={(checked) => setFormData({ ...formData, leadGen: !!checked })}
        />
        <Label htmlFor="leadGen">Lead Gen</Label>
      </div>

      {/* Commission Calculations Display */}
      {formData.actualGbpReceived && formData.leadGen && (
        <div className="p-4 bg-gray-50 border rounded-lg">
          <h4 className="font-semibold mb-3">Commission Calculations</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">BDR Commission ({formData.isMarkCawstonLead ? '50%' : '42.5%'}):</span>
              <div className="font-medium">
                £{((formData.actualGbpReceived || 0) * (formData.isMarkCawstonLead ? 0.50 : 0.425)).toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Dan Reeves Commission (7.5%):</span>
              <div className="font-medium">
                £{((formData.actualGbpReceived || 0) * 0.075).toFixed(2)}
              </div>
            </div>
          </div>
          {formData.isMarkCawstonLead && (
            <div className="mt-2 text-xs text-blue-600">
              * Mark Cawston lead - Higher BDR commission rate applies
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="commissionPaid"
            checked={formData.commissionPaid}
            onCheckedChange={(checked) => setFormData({ ...formData, commissionPaid: !!checked })}
          />
          <Label htmlFor="commissionPaid">BDR Commission Paid</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="danCommissionPaid"
            checked={formData.danCommissionPaid}
            onCheckedChange={(checked) => setFormData({ ...formData, danCommissionPaid: !!checked })}
          />
          <Label htmlFor="danCommissionPaid">Dan Commission Paid</Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
          placeholder="Enter any additional notes"
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : entry ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}