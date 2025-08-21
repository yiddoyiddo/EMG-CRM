import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createFinanceEntrySchema } from "@/lib/validations";
import { exchangeRateService } from "@/lib/exchange-rate";
import { Role } from "@prisma/client";

// GET - List finance entries with filters and monthly grouping
export async function GET(req: NextRequest) {
  try {
    // 1. Get Session securely on the server
    const session = await getServerSession(authOptions);

    // 2. Check Authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, id: userId } = session.user;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || undefined;
    const bdr = searchParams.get('bdr') || undefined;
    const month = searchParams.get('month') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const groupByMonth = searchParams.get('groupByMonth') === 'true';
    const analytics = searchParams.get('analytics') === 'true';
    const skip = (page - 1) * pageSize;
    
    // 3. Enforce Authorization (RBAC) - Build where clause with role-based filtering
    const where: {
      OR?: Array<{ company: { contains: string; mode: 'insensitive' } } | 
                  { notes: { contains: string; mode: 'insensitive' } }>;
      status?: string;
      bdr?: string; // Changed from { name: string } to string
      bdrId?: string;
      month?: string;
    } = {};

    // Role-based data filtering
    if (role === Role.BDR) {
      // BDRs can only see their own finance entries
      where.bdrId = userId;
    } else if (role === Role.ADMIN) {
      // Admins can see all finance entries - no additional filtering
    } else {
      // Unknown role - deny access
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    if (search) {
      where.OR = [
        { company: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    // Note: For BDRs, we ignore the 'bdr' filter param since they can only see their own data
    // For Admins, we can still apply the bdr filter if provided
    if (bdr) {
      // Accept BDR by name in UI; map to userId for query
      const targetUser = await prisma.user.findFirst({ where: { name: bdr }, select: { id: true } });
      if (targetUser) {
        where.bdrId = targetUser.id;
      } else {
        where.bdrId = '___NO_MATCH___';
      }
    }
    if (month) where.month = month;
    
    if (analytics) {
      // Get all finance entries for analytics
      const allEntries = await prisma.financeEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });
      
      // Calculate analytics
      const totalRevenue = allEntries.reduce((sum, entry) => sum + (entry.gbpAmount || 0), 0);
      
      // Year-to-date calculations
      const currentYear = new Date().getFullYear();
      const ytdEntries = allEntries.filter(entry => {
        const entryYear = entry.createdAt ? new Date(entry.createdAt).getFullYear() : currentYear;
        return entryYear === currentYear;
      });
      const ytdRevenue = ytdEntries.reduce((sum, entry) => sum + (entry.gbpAmount || 0), 0);
      const ytdDeals = ytdEntries.length;
      
      // Monthly calculations
      const currentMonth = new Date().toISOString().slice(0, 7);
      const currentMonthEntries = allEntries.filter(entry => entry.month === currentMonth);
      const monthlyRevenue = currentMonthEntries.reduce((sum, entry) => sum + (entry.gbpAmount || 0), 0);
      const monthlyDeals = currentMonthEntries.length;
      
      // Quarterly calculations
      const currentQuarter = Math.floor((new Date().getMonth() + 3) / 3);
      const quarterlyEntries = allEntries.filter(entry => {
        if (!entry.createdAt) return false;
        const entryDate = new Date(entry.createdAt);
        const entryQuarter = Math.floor((entryDate.getMonth() + 3) / 3);
        return entryDate.getFullYear() === currentYear && entryQuarter === currentQuarter;
      });
      const quarterlyRevenue = quarterlyEntries.reduce((sum, entry) => sum + (entry.gbpAmount || 0), 0);
      
      // Growth calculations
      const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);
      const lastMonthEntries = allEntries.filter(entry => entry.month === lastMonth);
      const lastMonthRevenue = lastMonthEntries.reduce((sum, entry) => sum + (entry.gbpAmount || 0), 0);
      const monthlyGrowth = lastMonthRevenue > 0 ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
      
      // Deal calculations
      const totalDeals = allEntries.length;
      const averageDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0;
      const conversionRate = totalDeals > 0 ? (allEntries.filter(entry => entry.status === 'Paid').length / totalDeals) * 100 : 0;
      
      // Calculate overdue days
      const overdueEntries = allEntries.filter(entry => 
        entry.status === 'Overdue' && entry.dueDate
      );
      const overdueDays = overdueEntries.length > 0 ? 
        overdueEntries.reduce((sum, entry) => {
          const daysDiff = Math.floor((new Date().getTime() - new Date(entry.dueDate!).getTime()) / (1000 * 60 * 60 * 24));
          return sum + daysDiff;
        }, 0) / overdueEntries.length : 0;
      
      // Calculate average payment time
      const paidEntries = allEntries.filter(entry => 
        entry.status === 'Paid' && entry.invoiceDate && entry.dueDate
      );
      const averagePaymentTime = paidEntries.length > 0 ? 
        paidEntries.reduce((sum, entry) => {
          const invoiceDate = new Date(entry.invoiceDate!);
          const dueDate = new Date(entry.dueDate!);
          const daysDiff = Math.floor((dueDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
          return sum + Math.abs(daysDiff);
        }, 0) / paidEntries.length : 0;
      
      // Status breakdown
      const statusBreakdown = allEntries.reduce((acc: {[key: string]: number}, entry) => {
        acc[entry.status] = (acc[entry.status] || 0) + 1;
        return acc;
      }, {});
      
      // Payment status
      const paymentStatus = {
        paid: allEntries.filter(entry => entry.status === 'Paid').length,
        pending: allEntries.filter(entry => entry.status === 'Pending').length,
        overdue: allEntries.filter(entry => entry.status === 'Overdue').length,
      };
      
      // Monthly trends (last 6 months)
      const monthlyTrends = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = date.toISOString().slice(0, 7);
        const monthEntries = allEntries.filter(entry => entry.month === monthStr);
        monthlyTrends.push({
          month: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
          revenue: monthEntries.reduce((sum, entry) => sum + (entry.gbpAmount || 0), 0),
          deals: monthEntries.length
        });
      }
      
      // BDR performance
      const bdrPerformance = Object.entries(
        allEntries.reduce((acc: {[key: string]: {revenue: number, deals: number}}, entry) => {
          const bdrName = entry.bdr || 'Unassigned';
          if (!acc[bdrName]) {
            acc[bdrName] = { revenue: 0, deals: 0 };
          }
          acc[bdrName].revenue += entry.gbpAmount || 0;
          acc[bdrName].deals += 1;
          return acc;
        }, {})
      ).map(([bdr, data]) => ({
        bdr,
        revenue: data.revenue,
        deals: data.deals,
        avgDealSize: data.deals > 0 ? data.revenue / data.deals : 0
      })).sort((a, b) => b.revenue - a.revenue);
      
      // Calculate Dan Reeves commission analytics
      const leadGenEntries = allEntries.filter(entry => entry.leadGen && entry.actualGbpReceived);
      
      const danCommissions = {
        totalOwed: 0,
        totalPaid: 0,
        outstanding: 0,
        byStatus: {} as { [key: string]: { owed: number; paid: number; outstanding: number } },
        byMonth: [] as Array<{ month: string; owed: number; paid: number; outstanding: number }>
      };
      
      // Calculate commission amounts using the same logic as frontend
      leadGenEntries.forEach(entry => {
        const actualGbp = entry.actualGbpReceived || 0;
        const danCommissionAmount = actualGbp * 0.075; // 7.5% for Dan
        
        danCommissions.totalOwed += danCommissionAmount;
        
        if (entry.danCommissionPaid) {
          danCommissions.totalPaid += danCommissionAmount;
        } else {
          danCommissions.outstanding += danCommissionAmount;
        }
        
        // Group by status
        const status = entry.status;
        if (!danCommissions.byStatus[status]) {
          danCommissions.byStatus[status] = { owed: 0, paid: 0, outstanding: 0 };
        }
        danCommissions.byStatus[status].owed += danCommissionAmount;
        if (entry.danCommissionPaid) {
          danCommissions.byStatus[status].paid += danCommissionAmount;
        } else {
          danCommissions.byStatus[status].outstanding += danCommissionAmount;
        }
      });
      
      // Group by month
      const monthlyCommissions = leadGenEntries.reduce((acc: {[key: string]: {owed: number, paid: number, outstanding: number}}, entry) => {
        const month = entry.month;
        const actualGbp = entry.actualGbpReceived || 0;
        const danCommissionAmount = actualGbp * 0.075;
        
        if (!acc[month]) {
          acc[month] = { owed: 0, paid: 0, outstanding: 0 };
        }
        
        acc[month].owed += danCommissionAmount;
        if (entry.danCommissionPaid) {
          acc[month].paid += danCommissionAmount;
        } else {
          acc[month].outstanding += danCommissionAmount;
        }
        
        return acc;
      }, {});
      
      // Convert to array and sort by month
      danCommissions.byMonth = Object.entries(monthlyCommissions)
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => b.month.localeCompare(a.month));
      
      const analytics = {
        totalRevenue,
        ytdRevenue,
        monthlyRevenue,
        quarterlyRevenue,
        averageDealSize,
        conversionRate,
        overdueDays,
        monthlyGrowth,
        totalDeals,
        ytdDeals,
        monthlyDeals,
        averagePaymentTime,
        statusBreakdown,
        monthlyTrends,
        bdrPerformance,
        paymentStatus,
        danCommissions
      };
      
      return NextResponse.json({ analytics });
    }
    
    if (groupByMonth) {
      // Get all entries grouped by month with BDR relation for name resolution
      const financeEntries = await prisma.financeEntry.findMany({
        where,
        orderBy: [
          { month: 'asc' },
          { createdAt: 'desc' }
        ],
        include: {
          bdr: { select: { name: true } }
        }
      });

      // Map BDR relation to string name for UI
      const normalized = financeEntries.map((e: any) => ({
        ...e,
        bdr: e.bdr?.name || '',
      }));

      // Group entries by month
      const groupedEntries = normalized.reduce((acc: { [key: string]: typeof normalized }, entry) => {
        if (!acc[entry.month]) {
          acc[entry.month] = [];
        }
        acc[entry.month].push(entry);
        return acc;
      }, {} as { [key: string]: typeof normalized });

      return NextResponse.json({
        groupedEntries,
        total: normalized.length,
      });
    }
    
    // Get total count
    const total = await prisma.financeEntry.count({ where });
    
    // Get finance entries
    const financeEntries = await prisma.financeEntry.findMany({
      where,
      skip,
      take: pageSize,
      include: {
        bdr: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { month: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    
    return NextResponse.json({
      financeEntries: financeEntries.map((e: any) => ({
        ...e,
        bdr: e.bdr?.name || '',
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
    
  } catch (error) {
    console.error("Error fetching finance entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch finance entries" },
      { status: 500 }
    );
  }
}

// POST - Create a new finance entry
export async function POST(req: NextRequest) {
  try {
    // 1. Get Session securely on the server
    const session = await getServerSession(authOptions);

    // 2. Check Authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, name: userName } = session.user;
    const data = await req.json();
    
    // Validate the finance entry data
    const validatedData = createFinanceEntrySchema.parse(data);
    
    // 3. Enforce Authorization (RBAC) for finance entry creation
    const financeData = { ...validatedData };
    
    if (role === Role.BDR) {
      // BDRs can only create finance entries assigned to themselves
      financeData.bdr = userName; // Use the user's name as the BDR
    } else if (role === Role.ADMIN) {
      // Admins can assign finance entries to any BDR
      // Use the provided bdr or assign to themselves if not provided
      if (!financeData.bdr) {
        financeData.bdr = userName;
      }
    } else {
      // Unknown role - deny access
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    // Convert date strings to Date objects
    const processedData = {
      ...financeData,
      invoiceDate: financeData.invoiceDate ? new Date(financeData.invoiceDate) : null,
      dueDate: financeData.dueDate ? new Date(financeData.dueDate) : null,
      exchangeRateDate: financeData.exchangeRateDate ? new Date(financeData.exchangeRateDate) : null,
    };
    
    // Handle automatic USD to GBP conversion if needed
    if (processedData.soldAmount && processedData.soldAmount > 0 && !processedData.gbpAmount) {
      try {
        const rate = await exchangeRateService.getCurrentRate();
        processedData.gbpAmount = exchangeRateService.convertUSDToGBP(processedData.soldAmount, rate);
        processedData.exchangeRate = rate;
        processedData.exchangeRateDate = new Date();
      } catch (error) {
        console.error('Error converting currency:', error);
        // Continue without conversion if API fails
      }
    }
    
    // Create the finance entry
    const financeEntry = await prisma.financeEntry.create({
      data: processedData
    });

    // Notify finance viewers about new deal
    try {
      const viewers = await prisma.user.findMany({ where: { isActive: true }, select: { id: true, role: true } });
      const eligible = viewers.filter(u => u.role === Role.ADMIN || u.role === Role.MANAGER || u.role === Role.DIRECTOR || u.role === Role.TEAM_LEAD || u.role === Role.BDR);
      const title = 'New Finance Deal Added';
      const message = `${financeEntry.company} • ${financeEntry.status}${financeEntry.gbpAmount ? ` • £${financeEntry.gbpAmount}` : ''}`;
      await Promise.all(
        eligible.map(u => fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/reporting/advanced/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: u.id, type: 'info', title, message, priority: 'high' })
        }).catch(() => null))
      );
    } catch {}

    return NextResponse.json(financeEntry, { status: 201 });
    
  } catch (error) {
    console.error("Error creating finance entry:", error);
    
    // Handle validation errors
    if (error && typeof error === 'object' && 'name' in error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: 'errors' in error ? error.errors : [] },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create finance entry" },
      { status: 500 }
    );
  }
}