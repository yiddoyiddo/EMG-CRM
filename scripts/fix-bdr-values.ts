import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

interface LeadCSV {
  Name: string;
  Title: string;
  'Date Created': string;
  BDR: string;
  Company: string;
  Source: string;
  Status: string;
  Link: string;
  Phone: string;
  Notes: string;
  Email: string;
}

interface UpdateCSV {
  'Item Name': string;
  'Created At': string;
  'Update Content': string;
}

async function fixBdrValues() {
  try {
    console.log('Starting BDR fixes...');

    // Read and parse both CSV files
    const leadsData = fs.readFileSync('Leads_1753352545.csv', 'utf-8');
    const updatesData = fs.readFileSync('Leads_1753352545 updates.csv', 'utf-8');

    const leads = parse(leadsData, {
      columns: true,
      skip_empty_lines: true
    }) as LeadCSV[];

    const updates = parse(updatesData, {
      columns: true,
      skip_empty_lines: true
    }) as UpdateCSV[];

    // Group updates by lead name
    const updatesByName = new Map<string, UpdateCSV[]>();
    for (const update of updates) {
      const name = update['Item Name'];
      if (!updatesByName.has(name)) {
        updatesByName.set(name, []);
      }
      updatesByName.get(name)?.push(update);
    }

    // Process each lead
    for (const lead of leads) {
      const name = lead.Name;
      const updates = updatesByName.get(name) || [];
      let bdr = lead.BDR || '';
      let notes = lead.Notes || '';

      // Add updates to notes and check for BDR assignments
      for (const update of updates) {
        const updateContent = update['Update Content'];
        
        // Check for BDR assignments in updates
        if (updateContent.includes('Passed to Stephen')) {
          bdr = 'Stephen Vivian';
        } else if (updateContent.includes('Passed to Thomas')) {
          bdr = 'Thomas Hardy';
        } else if (updateContent.includes('Passed to Jennifer')) {
          bdr = 'Jennifer Davies';
        }

        // Format and add update to notes
        const formattedUpdate = `[${update['Created At']}] ${updateContent}`;
        if (!notes.includes(formattedUpdate)) {
          notes = notes ? `${notes}\n\n${formattedUpdate}` : formattedUpdate;
        }
      }

      // Special cases
      if (name === 'Abel Sa') {
        bdr = 'Stephen Vivian';
      } else if (name === 'Abhijeet Prabhune') {
        bdr = 'Thomas Hardy';
      } else if (name.includes('Sébastien Page') || name.includes('Sbastien Page')) {
        await prisma.lead.updateMany({
          where: { name: { contains: 'bastien Page' } },
          data: { name: 'Sébastien Page' }
        });
      }

      // Update the lead in the database
      await prisma.lead.updateMany({
        where: { name },
        data: {
          bdr,
          notes
        }
      });

      console.log(`Updated ${name}: BDR = ${bdr}`);
    }

    console.log('BDR fixes completed successfully!');

  } catch (error) {
    console.error('Error fixing BDR values:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBdrValues(); 