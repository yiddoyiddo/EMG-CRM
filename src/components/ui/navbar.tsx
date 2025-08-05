'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, LineChart, TrendingUp } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };
  
  return (
    <div className="flex gap-2 mb-6 overflow-x-auto">
      <Link href="/">
        <Button 
          variant={isActive('/') && !isActive('/leads') && !isActive('/pipeline') && !isActive('/reporting') ? 'default' : 'outline'} 
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
  );
} 