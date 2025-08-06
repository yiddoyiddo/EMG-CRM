import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const companies = [
  'TechCorp Solutions', 'Global Marketing Inc', 'Innovation Partners', 'Digital Dynamics', 'Business Growth Ltd',
  'Strategic Ventures', 'Market Leaders Co', 'Enterprise Solutions', 'Professional Services Ltd', 'Growth Partners Inc',
  'Success Strategies', 'Peak Performance Ltd', 'Advanced Systems', 'Elite Business Co', 'Premier Solutions',
  'Optimum Results', 'Excellence Partners', 'Victory Enterprises', 'Pinnacle Business', 'Supreme Solutions',
  'Maximum Impact Ltd', 'Ultimate Success Co', 'Superior Services', 'Champion Enterprises', 'Leading Edge Ltd',
  'Cutting Edge Solutions', 'Next Level Business', 'Top Tier Services', 'Premier Performance', 'Elite Growth Co',
  'Apex Business Ltd', 'Summit Solutions', 'Peak Business Co', 'Premier Enterprises', 'Excellence Ltd',
  'Master Solutions', 'Elite Services Co', 'Prime Business Ltd', 'Supreme Enterprises', 'Victory Solutions Ltd'
];

const bdrs = [
  'Dan Reeves', 'Jess Collins', 'Jamie Waite', 'Stephen Vivian', 'Thomas Hardy',
  'Adel Mhiri', 'Gary Smith', 'Naeem Patel'
];

const statuses = [
  'Awaiting Invoice', 'Paid', 'Invoiced', 'Late', 'Pending Clearance',
  'On Hold', 'Sales Contacting', 'Net Date', 'Partial Payment'
];

const months = [
  '2025-01', '2025-02', '2025-03', '2025-04',
  '2025-05', '2025-06', '2025-07', '2025-08'
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function getRandomDate(month: string): Date {
  const [year, monthNum] = month.split('-');
  const daysInMonth = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
  const day = Math.floor(Math.random() * daysInMonth) + 1;
  return new Date(parseInt(year), parseInt(monthNum) - 1, day);
}

async function populateFinanceData() {
  console.log('Starting to populate finance data...');
  
  try {
    // Clear existing finance entries
    await prisma.financeEntry.deleteMany({});
    console.log('Cleared existing finance entries');

    for (const month of months) {
      console.log(`Populating data for ${month}...`);
      
      for (let i = 0; i < 5; i++) {
        const company = companies[Math.floor(Math.random() * companies.length)];
        const bdr = getRandomElement(bdrs);
        const status = getRandomElement(statuses);
        const invoiceDate = getRandomDate(month);
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 30) + 1);
        
        const soldAmount = getRandomAmount(5000, 50000);
        const gbpAmount = soldAmount * 0.8; // Approximate GBP conversion
        const actualGbpReceived = status === 'Paid' ? gbpAmount : (Math.random() > 0.5 ? gbpAmount * getRandomAmount(0.5, 1) : null);
        
        const entry = await prisma.financeEntry.create({
          data: {
            company: `${company} - ${month}`,
            bdr,
            leadGen: Math.random() > 0.5,
            status,
            invoiceDate,
            dueDate,
            soldAmount,
            gbpAmount,
            actualGbpReceived,
            notes: `Sample entry for ${company} in ${month}. ${status === 'Paid' ? 'Payment completed successfully.' : status === 'Late' ? 'Payment overdue, following up required.' : 'Processing as normal.'}`,
            commissionPaid: status === 'Paid' && Math.random() > 0.3,
            month
          }
        });
        
        console.log(`Created entry for ${company} - ${bdr} - ${status}`);
      }
    }
    
    console.log('✅ Successfully populated finance data for all months!');
    
    // Show summary
    const summary = await prisma.financeEntry.groupBy({
      by: ['month'],
      _count: {
        id: true
      },
      orderBy: {
        month: 'asc'
      }
    });
    
    console.log('\n📊 Summary:');
    summary.forEach(item => {
      const monthName = new Date(item.month + '-01').toLocaleDateString('en-GB', { 
        month: 'long', 
        year: 'numeric' 
      });
      console.log(`${monthName}: ${item._count.id} entries`);
    });
    
  } catch (error) {
    console.error('❌ Error populating finance data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateFinanceData();