import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestPipelineItem {
  name: string;
  title?: string;
  bdr: string;
  company: string;
  category: string;
  status: string;
  value?: number;
  probability?: number;
  expectedCloseDate?: Date;
  phone?: string;
  email?: string;
  callDate?: Date;
  notes?: string;
  addedDate: Date;
  lastUpdated: Date;
}

interface TestActivityLog {
  bdr: string;
  activityType: string;
  description: string;
  timestamp: Date;
  pipelineItemId?: number;
  scheduledDate?: Date;
  completedDate?: Date;
  previousStatus?: string;
  newStatus?: string;
}

async function createTestReportingData() {
  try {
    console.log('🔄 Creating comprehensive test reporting data...');
    
    const bdrs = ['Jennifer Davies', 'Mark Cawston', 'Naeem Patel', 'Rupert Kay', 'Verity Kay'];
    const companies = [
      'TechCorp Solutions', 'Digital Marketing Ltd', 'Innovation Systems', 'Global Enterprises',
      'Smart Solutions Ltd', 'Future Tech Inc', 'Business Dynamics', 'Creative Agency',
      'Data Solutions Co', 'Enterprise Services', 'Modern Systems', 'Strategic Partners',
      'Tech Innovations', 'Digital Solutions', 'Business Partners', 'Growth Solutions',
      'Market Leaders', 'Industry Experts', 'Professional Services', 'Consulting Group'
    ];

    const categories = ['Calls', 'Lists_Media_QA', 'Lists'];
    
    // Conversion funnel statuses in order of progression
    const conversionStatuses = [
      'BDR Followed Up',
      'Call Booked', 
      'Proposal - Profile',
      'Proposal - Media Sales',
      'Agreement - Profile',
      'List Out',
      'Sold'
    ];
    
    const declineStatuses = ['DECLINED', 'Passed Over'];

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const testPipelineItems: TestPipelineItem[] = [];
    const testActivityLogs: TestActivityLog[] = [];

    // Create realistic conversion funnel data for each BDR
    bdrs.forEach((bdr, bdrIndex) => {
      const baseItemsPerBdr = 25 + Math.floor(Math.random() * 15); // 25-40 items per BDR
      
      for (let i = 0; i < baseItemsPerBdr; i++) {
        const companyIndex = Math.floor(Math.random() * companies.length);
        const company = companies[companyIndex];
        const personName = `${['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emma', 'Chris', 'Lisa'][Math.floor(Math.random() * 8)]} ${['Smith', 'Johnson', 'Brown', 'Williams', 'Jones', 'Garcia', 'Miller', 'Davis'][Math.floor(Math.random() * 8)]}`;
        
        // Determine where in the funnel this item is (realistic distribution)
        const funnelPosition = Math.random();
        let status: string;
        let category: string;
        let value: number | undefined;
        let probability: number | undefined;
        let callDate: Date | undefined;
        let addedDaysAgo: number;
        
        if (funnelPosition < 0.15) {
          // 15% - Early stage: BDR Followed Up
          status = 'BDR Followed Up';
          category = 'Calls';
          addedDaysAgo = Math.floor(Math.random() * 7); // Recent
        } else if (funnelPosition < 0.35) {
          // 20% - Call Booked
          status = 'Call Booked';
          category = 'Calls';
          callDate = new Date(now.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000); // Future call
          addedDaysAgo = Math.floor(Math.random() * 14);
        } else if (funnelPosition < 0.50) {
          // 15% - Proposals
          status = Math.random() < 0.6 ? 'Proposal - Profile' : 'Proposal - Media Sales';
          category = 'Calls';
          value = 2000 + Math.random() * 8000;
          probability = 30 + Math.random() * 40;
          addedDaysAgo = Math.floor(Math.random() * 21);
        } else if (funnelPosition < 0.65) {
          // 15% - Agreements
          status = 'Agreement - Profile';
          category = 'Calls';
          value = 2500 + Math.random() * 7500;
          probability = 80 + Math.random() * 20;
          addedDaysAgo = Math.floor(Math.random() * 30);
        } else if (funnelPosition < 0.80) {
          // 15% - List Out
          status = 'List Out';
          category = Math.random() < 0.7 ? 'Lists_Media_QA' : 'Lists';
          value = 1500 + Math.random() * 5000;
          probability = 60 + Math.random() * 30;
          addedDaysAgo = Math.floor(Math.random() * 45);
        } else if (funnelPosition < 0.90) {
          // 10% - Sold (success!)
          status = 'Sold';
          category = Math.random() < 0.7 ? 'Lists_Media_QA' : 'Lists';
          value = 2000 + Math.random() * 6000;
          probability = 100;
          addedDaysAgo = Math.floor(Math.random() * 60);
        } else {
          // 10% - Declined/Passed Over
          status = Math.random() < 0.7 ? 'DECLINED' : 'Passed Over';
          category = 'Calls';
          addedDaysAgo = Math.floor(Math.random() * 45);
        }
        
        const addedDate = new Date(now.getTime() - addedDaysAgo * 24 * 60 * 60 * 1000);
        const lastUpdated = new Date(addedDate.getTime() + Math.random() * addedDaysAgo * 24 * 60 * 60 * 1000);

        const pipelineItem: TestPipelineItem = {
          name: personName,
          title: ['CEO', 'Marketing Director', 'Operations Manager', 'Sales Manager', 'Business Owner'][Math.floor(Math.random() * 5)],
          bdr,
          company,
          category,
          status,
          value,
          probability,
          callDate,
          phone: `+44 ${Math.floor(Math.random() * 10000000000).toString().padStart(10, '0')}`,
          email: `${personName.toLowerCase().replace(' ', '.')}@${company.toLowerCase().replace(/[^a-z]/g, '')}.com`,
          notes: `Generated test data for ${status} stage`,
          addedDate,
          lastUpdated,
          expectedCloseDate: value ? new Date(now.getTime() + Math.random() * 60 * 24 * 60 * 60 * 1000) : undefined
        };

        testPipelineItems.push(pipelineItem);
      }
      
      // Create some upcoming calls for this BDR
      for (let i = 0; i < 3 + Math.floor(Math.random() * 5); i++) {
        const company = companies[Math.floor(Math.random() * companies.length)];
        const personName = `${['Alex', 'Sam', 'Jordan', 'Casey', 'Taylor'][Math.floor(Math.random() * 5)]} ${['Wilson', 'Anderson', 'Thomas', 'Jackson', 'White'][Math.floor(Math.random() * 5)]}`;
        
        const daysFromNow = 1 + Math.floor(Math.random() * 14); // 1-14 days from now
        const callDate = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
        
        testPipelineItems.push({
          name: personName,
          title: ['Director', 'Manager', 'VP Sales', 'Head of Marketing'][Math.floor(Math.random() * 4)],
          bdr,
          company,
          category: 'Calls',
          status: 'Call Booked',
          callDate,
          phone: `+44 ${Math.floor(Math.random() * 10000000000).toString().padStart(10, '0')}`,
          email: `${personName.toLowerCase().replace(' ', '.')}@${company.toLowerCase().replace(/[^a-z]/g, '')}.com`,
          notes: 'Upcoming scheduled call',
          addedDate: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          lastUpdated: now
        });
      }
    });

    console.log(`📊 Generated ${testPipelineItems.length} test pipeline items`);

    // Create pipeline items in batches
    const batchSize = 50;
    const createdItems: any[] = [];
    
    for (let i = 0; i < testPipelineItems.length; i += batchSize) {
      const batch = testPipelineItems.slice(i, i + batchSize);
      const created = await prisma.pipelineItem.createMany({
        data: batch
      });
      console.log(`✅ Created batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(testPipelineItems.length/batchSize)} (${created.count} items)`);
    }

    // Get all created pipeline items to create activity logs
    const allItems = await prisma.pipelineItem.findMany({
      where: {
        bdr: { in: bdrs }
      },
      orderBy: { id: 'desc' },
      take: testPipelineItems.length
    });

    // Create activity logs for realistic tracking
    allItems.forEach((item, index) => {
      const logsPerItem = 1 + Math.floor(Math.random() * 4); // 1-4 logs per item
      
      for (let i = 0; i < logsPerItem; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const timestamp = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        
        const activityTypes = [
          'Status_Change', 'Call_Scheduled', 'Call_Completed', 'Email_Sent', 
          'Follow_Up', 'Proposal_Sent', 'Agreement_Signed', 'Note_Added'
        ];
        
        const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
        
        testActivityLogs.push({
          bdr: item.bdr,
          activityType,
          description: `${activityType.replace('_', ' ')} for ${item.name} at ${item.company}`,
          timestamp,
          pipelineItemId: item.id,
          previousStatus: index > 0 ? 'BDR Followed Up' : undefined,
          newStatus: item.status
        });
      }
    });

    // Create activity logs
    if (testActivityLogs.length > 0) {
      await prisma.activityLog.createMany({
        data: testActivityLogs
      });
      console.log(`📝 Created ${testActivityLogs.length} activity logs`);
    }

    // Summary statistics
    const statusCounts = testPipelineItems.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bdrCounts = testPipelineItems.reduce((acc, item) => {
      acc[item.bdr] = (acc[item.bdr] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📈 Test Data Summary:');
    console.log('Status Distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    console.log('\nBDR Distribution:');
    Object.entries(bdrCounts).forEach(([bdr, count]) => {
      console.log(`  ${bdr}: ${count}`);
    });

    console.log('\n✅ Test reporting data created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestReportingData(); 