import { prisma } from "@/lib/db";
import { createFinanceEntrySchema } from "@/lib/validations";
import { NextRequest, NextResponse } from "next/server";
import { exchangeRateService } from "@/lib/exchange-rate";

// GET - List finance entries with filters and monthly grouping
export async function GET(req: NextRequest) {
  try {
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
    
    // Build where clause
    const where: {
      OR?: Array<{ company: { contains: string; mode: 'insensitive' } } | 
                  { bdr: { contains: string; mode: 'insensitive' } } | 
                  { notes: { contains: string; mode: 'insensitive' } }>;
      status?: string;
      bdr?: string;
      month?: string;
    } = {};
    if (search) {
      where.OR = [
        { company: { contains: search, mode: 'insensitive' } },
        { bdr: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (bdr) where.bdr = bdr;
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
          if (!acc[entry.bdr]) {
            acc[entry.bdr] = { revenue: 0, deals: 0 };
          }
          acc[entry.bdr].revenue += entry.gbpAmount || 0;
          acc[entry.bdr].deals += 1;
          return acc;
        }, {})
      ).map(([bdr, data]) => ({
        bdr,
        revenue: data.revenue,
        deals: data.deals,
        avgDealSize: data.deals > 0 ? data.revenue / data.deals : 0
      })).sort((a, b) => b.revenue - a.revenue);
      
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
        paymentStatus
      };
      
      return NextResponse.json({ analytics });
    }
    
    if (groupByMonth) {
      // Get all entries grouped by month
      const financeEntries = await prisma.financeEntry.findMany({
        where,
        orderBy: [
          { month: 'asc' },
          { createdAt: 'desc' }
        ]
      });
      
      // Group entries by month
      const groupedEntries = financeEntries.reduce((acc: { [key: string]: any[] }, entry) => {
        if (!acc[entry.month]) {
          acc[entry.month] = [];
        }
        acc[entry.month].push(entry);
        return acc;
      }, {});
      
      return NextResponse.json({
        groupedEntries,
        total: financeEntries.length,
      });
    }
    
    // Get total count
    const total = await prisma.financeEntry.count({ where });
    
    // Get finance entries
    const financeEntries = await prisma.financeEntry.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [
        { month: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    
    return NextResponse.json({
      financeEntries,
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
    const data = await req.json();
    
    // Validate the finance entry data
    const validatedData = createFinanceEntrySchema.parse(data);
    
    // Convert date strings to Date objects
    const processedData = {
      ...validatedData,
      invoiceDate: validatedData.invoiceDate ? new Date(validatedData.invoiceDate) : null,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
      exchangeRateDate: validatedData.exchangeRateDate ? new Date(validatedData.exchangeRateDate) : null,
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
      data: processedData,
    });
    
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