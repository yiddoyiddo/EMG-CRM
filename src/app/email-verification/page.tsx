'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, AlertCircle, Loader2, Mail, Upload, Search, User } from 'lucide-react';

interface EmailResult {
  email: string;
  user: string;
  domain: string;
  mx: string;
  code: 'ok' | 'ko' | 'mb';
  message: string;
}

interface VerificationResponse {
  success: boolean;
  results: EmailResult[];
  total: number;
  verified: number;
  invalid: number;
  unverifiable: number;
  error?: string;
}

interface EmailFindResult extends EmailResult {
  status: 'Valid' | 'Invalid' | 'Unverifiable';
}

interface EmailFindResponse {
  success: boolean;
  results: EmailFindResult[];
  validEmails: EmailFindResult[];
  totalTested: number;
  validCount: number;
  invalidCount: number;
  unverifiableCount: number;
  firstName: string;
  lastName: string;
  domain: string;
  error?: string;
}

export default function EmailVerificationPage() {
  // Verification tab state
  const [emails, setEmails] = useState('');
  const [results, setResults] = useState<EmailResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<Omit<VerificationResponse, 'results' | 'success'> | null>(null);
  
  // Find email tab state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [domain, setDomain] = useState('');
  const [findResults, setFindResults] = useState<EmailFindResult[]>([]);
  const [findValidEmails, setFindValidEmails] = useState<EmailFindResult[]>([]);
  const [isFindLoading, setIsFindLoading] = useState(false);
  const [findSummary, setFindSummary] = useState<Omit<EmailFindResponse, 'results' | 'validEmails' | 'success'> | null>(null);

  const parseEmails = (text: string): string[] => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex);
    return matches ? [...new Set(matches)] : [];
  };

  const handleVerification = async () => {
    const emailList = parseEmails(emails);
    
    if (emailList.length === 0) {
      alert('Please enter at least one valid email address');
      return;
    }

    setIsLoading(true);
    setResults([]);
    setSummary(null);

    try {
      // Get authentication token
      const tokenResponse = await fetch('/api/email-verification/token');
      const tokenData = await tokenResponse.json();

      if (!tokenData.success) {
        throw new Error('Failed to get authentication token');
      }

      // Verify emails
      const verificationResponse = await fetch('/api/email-verification/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emails: emailList,
          token: tokenData.token,
        }),
      });

      const data: VerificationResponse = await verificationResponse.json();

      if (data.success) {
        setResults(data.results);
        setSummary({
          total: data.total,
          verified: data.verified,
          invalid: data.invalid,
          unverifiable: data.unverifiable,
        });
      } else {
        throw new Error(data.error || 'Verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFindEmail = async () => {
    if (!firstName.trim() || !lastName.trim() || !domain.trim()) {
      alert('Please fill in all fields: first name, last name, and domain');
      return;
    }

    setIsFindLoading(true);
    setFindResults([]);
    setFindValidEmails([]);
    setFindSummary(null);

    try {
      // Get authentication token
      const tokenResponse = await fetch('/api/email-verification/token');
      const tokenData = await tokenResponse.json();

      if (!tokenData.success) {
        throw new Error('Failed to get authentication token');
      }

      // Find emails
      const findResponse = await fetch('/api/email-verification/find', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          domain: domain.trim(),
          token: tokenData.token,
        }),
      });

      const data: EmailFindResponse = await findResponse.json();

      if (data.success) {
        setFindResults(data.results);
        setFindValidEmails(data.validEmails);
        setFindSummary({
          totalTested: data.totalTested,
          validCount: data.validCount,
          invalidCount: data.invalidCount,
          unverifiableCount: data.unverifiableCount,
          firstName: data.firstName,
          lastName: data.lastName,
          domain: data.domain,
        });
      } else {
        throw new Error(data.error || 'Email finding failed');
      }
    } catch (error) {
      console.error('Find email error:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setIsFindLoading(false);
    }
  };

  const getStatusIcon = (code: string) => {
    switch (code) {
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'ko':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'mb':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (code: string) => {
    switch (code) {
      case 'ok':
        return <Badge variant="default" className="bg-green-100 text-green-800">Valid</Badge>;
      case 'ko':
        return <Badge variant="destructive">Invalid</Badge>;
      case 'mb':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Unverifiable</Badge>;
      default:
        return <Badge variant="destructive">Invalid</Badge>;
    }
  };

  const exportResults = () => {
    if (results.length === 0) return;

    const csv = [
      ['Email', 'Status', 'Message', 'User', 'Domain', 'MX Server'].join(','),
      ...results.map(result => [
        result.email,
        result.code === 'ok' ? 'Valid' : result.code === 'ko' ? 'Invalid' : 'Unverifiable',
        result.message,
        result.user,
        result.domain,
        result.mx
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-verification-results-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportFindResults = () => {
    if (findResults.length === 0) return;

    const csv = [
      ['Email', 'Status', 'Message', 'User', 'Domain', 'MX Server'].join(','),
      ...findResults.map(result => [
        result.email,
        result.status,
        result.message,
        result.user,
        result.domain,
        result.mx
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-find-results-${findSummary?.firstName || 'unknown'}-${findSummary?.lastName || 'unknown'}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Mail className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Email Verification</h1>
      </div>

      <Tabs defaultValue="verify" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="verify" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Verify Emails
          </TabsTrigger>
          <TabsTrigger value="find" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Find Email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="verify" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Verify Email Addresses</CardTitle>
              <CardDescription>
                Enter email addresses to verify their validity. You can paste multiple emails separated by commas, spaces, or new lines.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter email addresses here... (e.g., john@example.com, jane@domain.com)"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            rows={6}
            className="min-h-32"
          />
          
          <div className="flex gap-2">
            <Button 
              onClick={handleVerification} 
              disabled={isLoading || !emails.trim()}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Verify Emails
                </>
              )}
            </Button>
            
            {results.length > 0 && (
              <Button 
                onClick={exportResults}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Export CSV
              </Button>
            )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="find" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Find Email Address</CardTitle>
              <CardDescription>
                Enter a person's name and domain to discover their email address. We'll test common email formats to find valid addresses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">First Name</label>
                  <Input
                    placeholder="e.g., Dan"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Last Name</label>
                  <Input
                    placeholder="e.g., Reeves"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Domain</label>
                  <Input
                    placeholder="e.g., busenq.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleFindEmail} 
                  disabled={isFindLoading || !firstName.trim() || !lastName.trim() || !domain.trim()}
                  className="flex items-center gap-2"
                >
                  {isFindLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Finding...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Find Email
                    </>
                  )}
                </Button>
                
                {findResults.length > 0 && (
                  <Button 
                    onClick={exportFindResults}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Export CSV
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Verification Summary */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Verification Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{summary.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.verified}</div>
                <div className="text-sm text-muted-foreground">Valid</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{summary.invalid}</div>
                <div className="text-sm text-muted-foreground">Invalid</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{summary.unverifiable}</div>
                <div className="text-sm text-muted-foreground">Unverifiable</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Find Email Summary */}
      {findSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Email Search Summary</CardTitle>
            <CardDescription>
              Search results for {findSummary.firstName} {findSummary.lastName} @ {findSummary.domain}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{findSummary.totalTested}</div>
                <div className="text-sm text-muted-foreground">Total Tested</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{findSummary.validCount}</div>
                <div className="text-sm text-muted-foreground">Valid Found</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{findSummary.invalidCount}</div>
                <div className="text-sm text-muted-foreground">Invalid</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{findSummary.unverifiableCount}</div>
                <div className="text-sm text-muted-foreground">Unverifiable</div>
              </div>
            </div>
            
            {findValidEmails.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3 text-green-600 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Valid Email Addresses Found
                </h3>
                <div className="space-y-2">
                  {findValidEmails.map((email, index) => (
                    <div key={index} className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="font-mono font-medium">{email.email}</span>
                      </div>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        {email.message}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Verification Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Verification Results</CardTitle>
            <CardDescription>
              Detailed results for each email address
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>MX Server</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result.code)}
                          {result.email}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(result.code)}</TableCell>
                      <TableCell className="text-sm">{result.message}</TableCell>
                      <TableCell className="text-sm">{result.user}</TableCell>
                      <TableCell className="text-sm">{result.domain}</TableCell>
                      <TableCell className="text-sm font-mono">{result.mx}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Find Email Results */}
      {findResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Email Search Results</CardTitle>
            <CardDescription>
              All tested email patterns for {findSummary?.firstName} {findSummary?.lastName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email Pattern</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>MX Server</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {findResults.map((result, index) => (
                    <TableRow key={index} className={result.code === 'ok' ? 'bg-green-50 dark:bg-green-900/20' : ''}>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result.code)}
                          {result.email}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(result.code)}</TableCell>
                      <TableCell className="text-sm">{result.message}</TableCell>
                      <TableCell className="text-sm">{result.user}</TableCell>
                      <TableCell className="text-sm">{result.domain}</TableCell>
                      <TableCell className="text-sm font-mono">{result.mx}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}