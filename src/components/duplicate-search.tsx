'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Search, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { useDebounce } from '@/lib/hooks/use-debounce';

interface SearchResult {
  id: string;
  type: 'lead' | 'pipeline';
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  status: string;
  category?: string;
  value?: number;
  addedDate: string;
  lastActivity?: string;
  owner: {
    id: string;
    name: string;
    role: string;
  };
  relevanceScore: number;
}

interface SearchResponse {
  results: SearchResult[];
  totalFound: number;
  query: string;
  searchType: string;
}

export function DuplicateSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalFound, setTotalFound] = useState(0);

  const debouncedQuery = useDebounce(searchQuery, 300);

  const performSearch = useCallback(async (query: string, type: string, inactive: boolean) => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setTotalFound(0);
      return;
    }

    setLoading(true);
    
    try {
      const params = new URLSearchParams({
        query: query.trim(),
        type,
        limit: '50',
        includeInactive: inactive.toString(),
      });

      const response = await fetch(`/api/duplicates/search?${params}`);
      
      if (response.ok) {
        const data: SearchResponse = await response.json();
        setResults(data.results);
        setTotalFound(data.totalFound);
      } else {
        console.error('Search failed:', response.statusText);
        setResults([]);
        setTotalFound(0);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setTotalFound(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-search when debounced query changes
  useEffect(() => {
    performSearch(debouncedQuery, searchType, includeInactive);
  }, [debouncedQuery, searchType, includeInactive, performSearch]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lead':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'pipeline':
        return <Building2 className="h-4 w-4 text-green-500" />;
      default:
        return <Search className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string, type: string) => {
    if (type === 'pipeline') {
      if (status.includes('Won')) return 'default';
      if (status.includes('Lost') || status === 'Dead') return 'destructive';
      return 'secondary';
    }
    
    // Lead statuses
    if (status === 'Closed') return 'destructive';
    if (status.includes('Contacted')) return 'default';
    return 'secondary';
  };

  const formatValue = (value?: number) => {
    if (!value) return '';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.9) return 'bg-green-100 text-green-800';
    if (score >= 0.7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Database Search
        </CardTitle>
        <CardDescription>
          Search for existing contacts and companies to identify potential duplicates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Controls */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by name, company, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <Select value={searchType} onValueChange={setSearchType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Search type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="contact">Contact</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={includeInactive ? 'default' : 'outline'}
              onClick={() => setIncludeInactive(!includeInactive)}
              className="whitespace-nowrap"
            >
              Include Inactive
            </Button>
          </div>
        </div>

        {/* Search Status */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </div>
            ) : (
              <div>
                {searchQuery ? (
                  `Found ${totalFound} result${totalFound !== 1 ? 's' : ''} for "${searchQuery}"`
                ) : (
                  'Enter search terms to find existing records'
                )}
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-[80px]">Match</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.id} className="hover:bg-gray-50/50">
                    <TableCell>
                      <div className="flex items-center justify-center">
                        {getTypeIcon(result.type)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{result.name}</div>
                        {result.type === 'pipeline' && result.category && (
                          <div className="text-xs text-muted-foreground">
                            {result.category}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        {result.company || 'N/A'}
                      </div>
                      {result.value && (
                        <div className="text-xs text-muted-foreground">
                          {formatValue(result.value)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        {result.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate max-w-[150px]">{result.email}</span>
                          </div>
                        )}
                        {result.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{result.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(result.status, result.type)}>
                        {result.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{result.owner.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {result.owner.role.toLowerCase()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatDate(result.addedDate)}</div>
                        {result.lastActivity && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(result.lastActivity)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRelevanceColor(result.relevanceScore)}`}>
                          {Math.round(result.relevanceScore * 100)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : searchQuery && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No results found for "{searchQuery}"</p>
            <p className="text-sm">Try different search terms or check your filters</p>
          </div>
        )}

        {!searchQuery && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Start typing to search the database</p>
            <p className="text-sm">Search by company name, contact name, email, or phone number</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}