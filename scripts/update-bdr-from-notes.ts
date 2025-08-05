import { PrismaClient } from '@prisma/client';
import { leadBdrEnum } from '../src/lib/validations';

const prisma = new PrismaClient();

// Map common variations of names to the correct BDR
const bdrNameMap: Record<string, typeof leadBdrEnum[number]> = {
  'stephen': 'Stephen Vivian',
  'steve': 'Stephen Vivian',
  'tom': 'Thomas Hardy',
  'thomas': 'Thomas Hardy',
  'hardy': 'Thomas Hardy',
  'jess': 'Jess Collins',
  'jessica': 'Jess Collins',
  'jen': 'Jess Collins',
  'jamie': 'Jamie Waite',
  'james': 'Jamie Waite',
};

async function updateBdrFromNotes(dryRun = false) {
  try {
    // Get all leads with notes containing "passed to"
    const leads = await prisma.lead.findMany({
      where: {
        OR: [
          { notes: { contains: 'passed to' } },
          { notes: { contains: 'passed over to' } },
          { notes: { contains: 'passed across to' } },
        ],
      },
    });

    console.log(`Found ${leads.length} leads with "passed to" variations in notes`);
    console.log(dryRun ? 'DRY RUN - no changes will be made' : 'LIVE RUN - changes will be made');
    console.log('---');

    // Process each lead
    for (const lead of leads) {
      if (!lead.notes) continue;

      // Find BDR name in notes using various patterns
      const patterns = [
        /passed to\s+([^.,\n]+)/i,
        /passed over to\s+([^.,\n]+)/i,
        /passed across to\s+([^.,\n]+)/i,
      ];

      let bdrMatch = null;
      for (const pattern of patterns) {
        const match = lead.notes.toLowerCase().match(pattern);
        if (match) {
          bdrMatch = match;
          break;
        }
      }

      if (!bdrMatch) continue;

      const bdrName = bdrMatch[1].trim().toLowerCase();
      
      // First try exact match from enum
      let matchingBdr = leadBdrEnum.find(bdr => 
        bdrName.includes(bdr.toLowerCase())
      );

      // If no exact match, try common variations
      if (!matchingBdr) {
        const nameWords = bdrName.split(/\s+/);
        for (const word of nameWords) {
          const cleanWord = word.replace(/[^a-z]/g, ''); // Remove non-letter characters
          if (bdrNameMap[cleanWord]) {
            matchingBdr = bdrNameMap[cleanWord];
            break;
          }
        }
      }

      if (matchingBdr) {
        if (!dryRun) {
          // Update the lead with the correct BDR
          await prisma.lead.update({
            where: { id: lead.id },
            data: { bdr: matchingBdr },
          });
        }

        console.log(`${dryRun ? '[DRY RUN] Would update' : 'Updated'} lead ${lead.id} (${lead.name}): BDR set to ${matchingBdr}`);
      } else {
        console.log(`No matching BDR found for "${bdrMatch[1]}" in lead ${lead.id} (${lead.name})`);
        console.log(`Note: ${lead.notes}`);
      }
    }

    console.log('---');
    console.log('Finished processing leads');
  } catch (error) {
    console.error('Error updating BDRs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script in live mode
updateBdrFromNotes(false); 