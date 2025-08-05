import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  calculateTeamPerformance,
  identifyCriticalActions,
} from '@/lib/reporting-helpers';

async function postToSlack(actions: ReturnType<typeof identifyCriticalActions>) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl || actions.length === 0) return;

  const blocks = actions.map((action) => ({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*${action.priority.toUpperCase()}* | *${action.category.toUpperCase()}* – ${action.action} (${action.metric ?? ''})`,
    },
  }));

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'EMG CRM Alerts', blocks }),
    });
  } catch (err) {
    console.error('Failed to post alerts to Slack:', err);
  }
}

export async function GET() {
  try {
    const [pipelineItems, activityLogs] = await Promise.all([
      prisma.pipelineItem.findMany(),
      prisma.activityLog.findMany(),
    ]);

    const now = new Date();
    const teamPerformance = calculateTeamPerformance(pipelineItems, activityLogs);
    const actions = identifyCriticalActions(
      pipelineItems,
      activityLogs,
      teamPerformance,
      now,
    );

    // Fire and forget Slack notification (non-blocking)
    postToSlack(actions).catch(() => {});

    return NextResponse.json({ actions, generatedAt: now.toISOString() });
  } catch (error) {
    console.error('Error generating alerts:', error);
    return NextResponse.json(
      { error: (error as Error).message, actions: [] },
      { status: 500 },
    );
  }
} 