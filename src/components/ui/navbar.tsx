'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, LineChart, TrendingUp, DollarSign, FileText } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };
  
  return (
    <div className="mb-6">
      <div className="flex gap-2 overflow-x-auto rounded-xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-white/[0.05] backdrop-blur p-1 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.45)]">
        <Link href="/">
          <Button 
            variant={isActive('/') && !isActive('/leads') && !isActive('/pipeline') && !isActive('/reporting') && !isActive('/finance') && !isActive('/editorial') ? 'default' : 'outline'} 
            size="sm" 
            className="flex items-center gap-1 whitespace-nowrap"
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Button>
        </Link>
        <Link href="/leads">
          <Button 
            variant={isActive('/leads') ? 'default' : 'outline'} 
            size="sm"
            className="flex items-center gap-1 whitespace-nowrap"
          >
            <Users className="h-4 w-4" />
            <span>Leads</span>
          </Button>
        </Link>
        <Link href="/pipeline">
          <Button 
            variant={isActive('/pipeline') ? 'default' : 'outline'} 
            size="sm"
            className="flex items-center gap-1 whitespace-nowrap"
          >
            <LineChart className="h-4 w-4" />
            <span>Pipeline</span>
          </Button>
        </Link>
        <Link href="/finance">
          <Button 
            variant={isActive('/finance') ? 'default' : 'outline'} 
            size="sm"
            className="flex items-center gap-1 whitespace-nowrap"
          >
            <DollarSign className="h-4 w-4" />
            <span>Finance Board</span>
          </Button>
        </Link>
        <Link href="/editorial">
          <Button 
            variant={isActive('/editorial') ? 'default' : 'outline'} 
            size="sm"
            className="flex items-center gap-1 whitespace-nowrap"
          >
            <FileText className="h-4 w-4" />
            <span>Editorial Board</span>
          </Button>
        </Link>
        <Link href="/reporting">
          <Button 
            variant={isActive('/reporting') ? 'default' : 'outline'} 
            size="sm"
            className="flex items-center gap-1 whitespace-nowrap"
          >
            <TrendingUp className="h-4 w-4" />
            <span>Sales Performance</span>
          </Button>
        </Link>
      </div>
    </div>
  );
} 