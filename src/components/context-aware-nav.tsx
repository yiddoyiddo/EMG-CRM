'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { 
  Home, Users, LineChart, TrendingUp, Settings, Shield, 
  BarChart3, UserPlus, Calendar, Phone, Target, Award,
  Briefcase, DollarSign, FileText, Bell, Search, Menu, BookOpen, MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import React, { useMemo, useState } from 'react';
import { ChatDesktopNotifications } from '@/components/chat/notifications-client';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  roles: string[];
  description?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigationSections: NavSection[] = [
  {
    title: 'Dashboard & Overview',
    items: [
      {
        title: 'Dashboard',
        href: '/',
        icon: Home,
        roles: ['ADMIN', 'DIRECTOR', 'MANAGER', 'TEAM_LEAD', 'BDR'],
        description: 'Main dashboard overview'
      }
    ]
  },
  {
    title: 'Core CRM Functions',
    items: [
      {
        title: 'Chat',
        href: '/chat',
        icon: MessageCircle,
        roles: ['ADMIN', 'DIRECTOR', 'MANAGER', 'TEAM_LEAD', 'BDR'],
        description: 'Internal team messaging'
      },
      {
        title: 'Leads',
        href: '/leads',
        icon: Users,
        roles: ['ADMIN', 'DIRECTOR', 'MANAGER', 'TEAM_LEAD', 'BDR'],
        description: 'Manage your leads and prospects'
      },
      {
        title: 'Pipeline',
        href: '/pipeline',
        icon: LineChart,
        roles: ['ADMIN', 'DIRECTOR', 'MANAGER', 'TEAM_LEAD', 'BDR'],
        description: 'Track deals through sales stages'
      },
      {
        title: 'Editorial Board',
        href: '/editorial',
        icon: BookOpen,
        roles: ['ADMIN', 'DIRECTOR', 'MANAGER', 'TEAM_LEAD', 'BDR'],
        description: 'Manage Q&A and interview opportunities'
      },
      {
        title: 'Templates',
        href: '/templates',
        icon: FileText,
        roles: ['ADMIN', 'DIRECTOR', 'MANAGER', 'TEAM_LEAD', 'BDR'],
        description: 'BDR knowledgebase of reusable outreach templates'
      },
      {
        title: 'Call Schedule',
        href: '/pipeline?view=today',
        icon: Calendar,
        roles: ['BDR', 'TEAM_LEAD'],
        description: 'Today\'s scheduled calls'
      },
      {
        title: 'My Performance',
        href: '/reporting?view=personal',
        icon: Target,
        roles: ['BDR'],
        description: 'Personal KPIs and metrics'
      }
    ]
  },
  {
    title: 'Analytics & Reporting',
    items: [
      {
        title: 'Executive Reports',
        href: '/reporting',
        icon: TrendingUp,
        roles: ['ADMIN', 'DIRECTOR', 'MANAGER'],
        description: 'Complete business analytics'
      },
      {
        title: 'Team Reports',
        href: '/reporting/team',
        icon: BarChart3,
        roles: ['TEAM_LEAD', 'MANAGER', 'DIRECTOR', 'ADMIN'],
        description: 'Team performance metrics'
      },
      {
        title: 'Finance',
        href: '/finance',
        icon: DollarSign,
        roles: ['ADMIN', 'DIRECTOR', 'MANAGER'],
        description: 'Financial tracking and revenue'
      }
    ]
  },
  {
    title: 'Team Management',
    items: [
      {
        title: 'Team Management',
        href: '/team',
        icon: Users,
        roles: ['TEAM_LEAD', 'MANAGER', 'DIRECTOR', 'ADMIN'],
        description: 'Manage team members and performance'
      },
      {
        title: 'User Management',
        href: '/admin/users',
        icon: UserPlus,
        roles: ['ADMIN'],
        badge: 'Admin',
        description: 'Create and manage user accounts'
      }
    ]
  },
  {
    title: 'Quick Actions',
    items: [
      {
        title: 'Log Call',
        href: '/pipeline?action=new',
        icon: Phone,
        roles: ['BDR', 'TEAM_LEAD'],
        description: 'Quickly log a new call'
      },
      {
        title: 'Add Lead',
        href: '/leads?action=new',
        icon: UserPlus,
        roles: ['BDR', 'TEAM_LEAD', 'MANAGER'],
        description: 'Add a new lead to the system'
      }
    ]
  }
];

const NavItemComponent = React.memo(function NavItemComponent({ 
  item, 
  isMobile = false, 
  onItemClick 
}: { 
  item: NavItem; 
  isMobile?: boolean;
  onItemClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
  const Icon = item.icon;

  const content = (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
        "hover:bg-white/50 dark:hover:bg-white/10 hover:backdrop-blur",
        isActive
          ? "bg-white/70 dark:bg-white/10 text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)]"
          : "text-foreground/90",
        isMobile && "w-full"
      )}
    >
      <Icon className={cn("h-4 w-4 transition-colors", isActive ? "text-primary" : "text-foreground/70 group-hover:text-foreground")} />
      <span className="flex-1">{item.title}</span>
      {item.badge && (
        <Badge variant="secondary" className="text-xs">
          {item.badge}
        </Badge>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Link href={item.href} onClick={onItemClick} className="w-full">
        {content}
      </Link>
    );
  }

  return (
    <Link href={item.href} title={item.description}>
      {content}
    </Link>
  );
})

const NavigationContent = React.memo(function NavigationContent({ 
  isMobile = false, 
  onItemClick 
}: { 
  isMobile?: boolean;
  onItemClick?: () => void;
}) {
  const { data: session } = useSession();
  const userRole = session?.user?.role;

  if (!session || !userRole) {
    return null;
  }

  const filteredSections = useMemo(() => (
    navigationSections
      .map(section => ({
        ...section,
        items: section.items.filter(item => item.roles.includes(userRole))
      }))
      .filter(section => section.items.length > 0)
  ), [userRole]);

  return (
    <div className={cn("space-y-4", isMobile && "pb-4")}>
      {filteredSections.map((section, index) => (
        <div key={section.title}>
          <div className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {section.title}
          </div>
          <div className="space-y-1">
            {section.items.map((item) => (
              <NavItemComponent 
                key={item.href} 
                item={item} 
                isMobile={isMobile}
                onItemClick={onItemClick}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
})

export function ContextAwareNav() {
  const { data: session } = useSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (!session) {
    return null;
  }

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-50">
        <div className="flex flex-col flex-grow pt-5 overflow-y-auto border-r border-white/20 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl">
          <div className="flex items-center flex-shrink-0 px-4">
            <Link href="/" className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-semibold tracking-tight">EMG CRM</span>
            </Link>
          </div>
          <div className="mt-5 flex-1 px-4">
            <NavigationContent />
          </div>
          
          {/* User info at bottom */}
          <div className="flex-shrink-0 flex border-t border-white/20 dark:border-white/10 p-4 bg-white/30 dark:bg-white/[0.02]">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  {session.user?.name?.[0] || 'U'}
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {session.user?.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {session.user?.role}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <ChatDesktopNotifications userId={session.user.id} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/20 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold tracking-tight">EMG CRM</span>
          </Link>
          
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="backdrop-blur bg-white/60 dark:bg-white/[0.06]">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border-white/20 dark:border-white/10">
              <div className="flex items-center gap-2 mb-6">
                <Shield className="h-6 w-6 text-primary" />
                <span className="font-semibold tracking-tight">EMG CRM</span>
              </div>
              <NavigationContent 
                isMobile 
                onItemClick={() => setMobileNavOpen(false)} 
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  );
}

export function MainLayoutWithNav({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ContextAwareNav />
      <div className="md:pl-64">
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}