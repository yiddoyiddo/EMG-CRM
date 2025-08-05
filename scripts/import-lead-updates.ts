import { prisma } from "../src/lib/db";
import fs from 'fs';
import csv from 'csv-parse';
import { promisify } from 'util';

interface LeadUpdate {
  itemId: string;
  itemName: string;
  user: string;
  createdAt: string;
  updateContent: string;
  parentPostId?: string;
}

function parseDate(dateStr: string): Date {
  // Handle date format: "DD/Month/YYYY HH:mm:ss AM/PM"
  const [datePart, timePart] = dateStr.split('  ');
  const [day, month, year] = datePart.split('/');
  const [time, ampm] = timePart.split(' ');
  const [hours, minutes, seconds] = time.split(':');

  // Convert month name to number
  const monthMap: Record<string, number> = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'July': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };

  let hour = parseInt(hours);
  if (ampm === 'PM' && hour < 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;

  return new Date(
    parseInt(year),
    monthMap[month],
    parseInt(day),
    hour,
    parseInt(minutes),
    parseInt(seconds)
  );
}

async function importLeadUpdates() {
  try {
    // Read the CSV file
    const fileContent = fs.readFileSync('Leads_1753352545 updates.csv', 'utf-8');
    
    // Parse CSV
    const parser = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      from_line: 2 // Skip the first line which contains "Leads,Updates,,,,,,,,,"
    });

    const records: LeadUpdate[] = [];
    
    // Process each row
    for await (const record of parser) {
      if (record['Item ID'] && record['Update Content']) {
        records.push({
          itemId: record['Item ID'],
          itemName: record['Item Name'],
          user: record['User'],
          createdAt: record['Created At'],
          updateContent: record['Update Content'],
          parentPostId: record['Parent Post ID']
        });
      }
    }

    // Group updates by lead name
    const updatesByName = records.reduce((acc, curr) => {
      if (!acc[curr.itemName]) {
        acc[curr.itemName] = [];
      }
      acc[curr.itemName].push(curr);
      return acc;
    }, {} as Record<string, LeadUpdate[]>);

    // Process each lead's updates
    for (const [name, updates] of Object.entries(updatesByName)) {
      // Find the lead in the database
      const lead = await prisma.lead.findFirst({
        where: { name }
      });

      if (lead) {
        // Sort updates by date
        updates.sort((a, b) => {
          const dateA = parseDate(a.createdAt);
          const dateB = parseDate(b.createdAt);
          return dateA.getTime() - dateB.getTime();
        });

        // Format updates
        const formattedUpdates = updates.map(update => {
          const date = parseDate(update.createdAt).toLocaleDateString('en-GB');
          const indent = update.parentPostId ? '  ' : ''; // Indent replies
          return `${indent}[${date}] ${update.user}: ${update.updateContent}`;
        }).join('\n\n');

        // Update the lead
        await prisma.lead.update({
          where: { id: lead.id },
          data: { notes: formattedUpdates } // Replace existing notes with formatted updates
        });

        console.log(`Updated notes for ${name}`);
      } else {
        console.log(`Lead not found: ${name}`);
      }
    }

    console.log('Import completed successfully');
  } catch (error) {
    console.error('Error importing lead updates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importLeadUpdates()
  .catch(console.error); 