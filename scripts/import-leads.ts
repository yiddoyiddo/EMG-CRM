import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

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

const prisma = new PrismaClient();

async function importLeads() {
  try {
    // Read and parse the CSV files
    const leadsData = fs.readFileSync(path.join(process.cwd(), 'Leads_1753352545.csv'));
    const updatesData = fs.readFileSync(path.join(process.cwd(), 'Leads_1753352545 updates.csv'));

    const leads = parse(leadsData, {
      columns: true,
      skip_empty_lines: true
    }) as LeadCSV[];

    const updates = parse(updatesData, {
      columns: true,
      skip_empty_lines: true,
      from_line: 3 // Skip the "Leads,Updates" header
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

    // First, get all existing leads
    const existingLeads = await prisma.lead.findMany();
    const existingLeadsByEmail = new Map(
      existingLeads.filter(l => l.email).map(l => [l.email, l])
    );
    const existingLeadsByName = new Map(
      existingLeads.map(l => [l.name.toLowerCase(), l])
    );

    // Process each lead
    for (const lead of leads) {
      // Skip empty rows
      if (!lead.Name || lead.Name.trim() === '') {
        continue;
      }

      const updates = updatesByName.get(lead.Name) || [];
      const updateNotes = updates
        .sort((a, b) => new Date(a['Created At']).getTime() - new Date(b['Created At']).getTime())
        .map(u => `${u['Created At']}: ${u['Update Content']}`)
        .join('\n');

      // Parse date - handle the specific format YYYY-MM-DD
      const [year, month, day] = lead['Date Created'].split('-').map(Number);
      const dateCreated = new Date(year, month - 1, day); // month is 0-based in JS Date

      // Try to find existing lead by email or name
      const existingLead = lead.Email 
        ? existingLeadsByEmail.get(lead.Email)
        : existingLeadsByName.get(lead.Name.toLowerCase());

      const leadData = {
        name: lead.Name,
        title: lead.Title || null,
        addedDate: dateCreated,
        bdr: lead.BDR || null,
        company: lead.Company || null,
        source: lead.Source || 'Other',
        status: lead.Status,
        link: lead.Link || null,
        phone: lead.Phone || null,
        email: lead.Email || null
      };

      try {
        if (existingLead) {
          // Merge notes: combine existing notes with new notes and updates
          const existingNotes = existingLead.notes || '';
          const newNotes = lead.Notes || '';
          const combinedNotes = [existingNotes, newNotes, updateNotes]
            .filter(Boolean)
            .join('\n\n')
            .trim();

          // Update existing lead
          await prisma.lead.update({
            where: { id: existingLead.id },
            data: {
              ...leadData,
              notes: combinedNotes || null
            }
          });
          console.log(`Updated lead: ${lead.Name}`);
        } else {
          // Create new lead
          await prisma.lead.create({
            data: {
              ...leadData,
              notes: [lead.Notes, updateNotes].filter(Boolean).join('\n\n').trim() || null
            }
          });
          console.log(`Imported lead: ${lead.Name}`);
        }
      } catch (error) {
        console.error(`Error processing lead ${lead.Name}:`, error);
      }
    }

    // Clean up duplicate leads
    const allLeads = await prisma.lead.findMany({
      orderBy: { addedDate: 'asc' }
    });
    
    const seenEmails = new Set<string>();
    const seenNames = new Set<string>();
    const duplicateIds = new Set<number>();

    for (const lead of allLeads) {
      const email = lead.email?.toLowerCase();
      const name = lead.name.toLowerCase();

      if (email && seenEmails.has(email)) {
        duplicateIds.add(lead.id);
      } else if (seenNames.has(name)) {
        duplicateIds.add(lead.id);
      }

      if (email) seenEmails.add(email);
      seenNames.add(name);
    }

    if (duplicateIds.size > 0) {
      await prisma.lead.deleteMany({
        where: {
          id: {
            in: Array.from(duplicateIds)
          }
        }
      });
      console.log(`Cleaned up ${duplicateIds.size} duplicate leads`);
    }

    console.log('Import completed successfully');
  } catch (error) {
    console.error('Error importing leads:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importLeads(); 