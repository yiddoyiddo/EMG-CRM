import { NextRequest, NextResponse } from 'next/server';
// import { requireRole } from '@/lib/authorize';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bdr = searchParams.get('bdr');

  const pipelineWhere: any = {};
  const activityWhere: any = {};
  const financeWhere: any = {};
  if (bdr && bdr !== 'all') {
    pipelineWhere.bdr = bdr;
    activityWhere.bdr = bdr;
    financeWhere.bdr = bdr;
  }

  const [callsConducted, proposalsSent, agreementsSigned, listsSent, sales] = await Promise.all([
    prisma.activityLog.count({ where: { ...activityWhere, activityType: 'Call_Completed' } }),
    prisma.activityLog.count({ where: { ...activityWhere, activityType: 'Proposal_Sent' } }),
    prisma.activityLog.count({ where: { ...activityWhere, activityType: 'Agreement_Sent' } }),
    prisma.activityLog.count({ where: { ...activityWhere, activityType: 'Partner_List_Sent' } }),
    prisma.financeEntry.count({ where: { ...financeWhere } }), // Count all finance entries as sales
  ]);

  return NextResponse.json({
    callsConducted,
    proposalsSent,
    agreementsSigned,
    listsSent,
    sales,
  });
} 