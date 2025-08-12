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

const prisma = new PrismaClient();

// BDR mapping based on notes and CSV data
const bdrMappings: Record<string, string> = {
  'Abel Sa': 'Stephen Vivian',
  'Abhijeet Prabhune': 'Thomas Hardy',
  'Sébastien Page': 'Jennifer Davies',
  'Sbastien Page': 'Jennifer Davies', // Fix encoding issue
  'Andrea Macchia': 'Stephen Vivian',
  'Rogerio Braz': 'Stephen Vivian',
  'Brian Timmeny': 'Stephen Vivian',
  'Mary Beth Green': 'Stephen Vivian',
  'Laura Kendrick': 'Stephen Vivian',
  'Jaime Smeke': 'Stephen Vivian',
  'Abhishek Gaurav': 'Stephen Vivian',
  'Alaa Abu Zaytoon': 'Stephen Vivian',
  'Alex Broadbent': 'Stephen Vivian',
  'Derek Taylor': 'Stephen Vivian',
  'Fabiano Rosa': 'Stephen Vivian',
  'Ganesh Kaupannan': 'Stephen Vivian',
  'Abel Sá': 'Stephen Vivian', // Fix encoding
  'Abel S': 'Stephen Vivian', // Fix encoding
};

// Company name fixes
const companyFixes: Record<string, string> = {
  '3 Coraes': '3 Corações',
  '3 Coraões': '3 Corações',
  'Kofola ?eskoSlovensko': 'Kofola ČeskoSlovensko',
  'Kofola ČeskoSlovensko': 'Kofola ČeskoSlovensko',
  'Corpuls': 'Corpuls',
  'Christoph Brnnimann': 'Christoph Brönnimann',
  'Christoph Brönnimann': 'Christoph Brönnimann',
  'Kerem K?z?ltun': 'Kerem Kızıltunç',
  'Kerem Kızıltunç': 'Kerem Kızıltunç',
  'Kerem K?z?ltunç': 'Kerem Kızıltunç',
  'Emmanuel Gutirrez-Corts': 'Emmanuel Gutiérrez-Cortés',
  'Emmanuel Gutiérrez-Cortés': 'Emmanuel Gutiérrez-Cortés',
  'Joo Costa Madureira': 'João Costa Madureira',
  'João Costa Madureira': 'João Costa Madureira',
  'Sbastien Page': 'Sébastien Page',
  'Sébastien Page': 'Sébastien Page',
  'Gudmundur Sigurdsson': 'Gudmundur Sigurdsson',
  'Alain Lachapelle': 'Alain Lachapelle',
  'Soren Petsch': 'Soren Petsch',
  'Jairo Cesar': 'Jairo Cesar',
  'Fernando Bosch': 'Fernando Bosch',
  'Anish Azeez': 'Anish Azeez',
  'Adeel Abbasi': 'Adeel Abbasi',
  'Soumendu S': 'Soumendu S',
  'Arik Spitzer': 'Arik Spitzer',
  'Amy Aguirre': 'Amy Aguirre',
  'Jacob Harrison': 'Jacob Harrison',
  'Vivian Wu': 'Vivian Wu',
  'Joel Klooster': 'Joel Klooster',
  'Ali Rashed': 'Ali Rashed',
  'Thomas Scott': 'Thomas Scott',
  'Jussi Lemola': 'Jussi Lemola',
  'Ankit Dalal': 'Ankit Dalal',
  'Nishant Deep': 'Nishant Deep',
  'Claire Phillips': 'Claire Phillips',
  'Andrea Macchia': 'Andrea Macchia',
};

// Function to extract the last BDR from a comma-separated list
function getLastBDR(bdrString: string): string {
  if (!bdrString) return '';
  
  const bdrs = bdrString.split(',').map(b => b.trim());
  return bdrs[bdrs.length - 1];
}

// Function to determine BDR from notes
function getBDRFromNotes(notes: string): string | null {
  if (!notes) return null;
  
  const lowerNotes = notes.toLowerCase();
  
  if (lowerNotes.includes('passed to stephen') || lowerNotes.includes('stephen')) {
    return 'Stephen Vivian';
  }
  if (lowerNotes.includes('passed to thomas') || lowerNotes.includes('thomas hardy')) {
    return 'Thomas Hardy';
  }
  if (lowerNotes.includes('passed to jen') || lowerNotes.includes('jennifer davies')) {
    return 'Jennifer Davies';
  }
  if (lowerNotes.includes('passed to mark') || lowerNotes.includes('mark cawston')) {
    return 'Mark Cawston';
  }
  if (lowerNotes.includes('passed to gary') || lowerNotes.includes('gary smith')) {
    return 'Gary Smith';
  }
  if (lowerNotes.includes('passed to naeem') || lowerNotes.includes('naeem patel')) {
    return 'Naeem Patel';
  }
  if (lowerNotes.includes('passed to verity') || lowerNotes.includes('verity kay')) {
    return 'Verity Kay';
  }
  if (lowerNotes.includes('passed to rupert') || lowerNotes.includes('rupert kay')) {
    return 'Rupert Kay';
  }
  if (lowerNotes.includes('passed to jess') || lowerNotes.includes('jess collins')) {
    return 'Jess Collins';
  }
  if (lowerNotes.includes('passed to jamie') || lowerNotes.includes('jamie waite')) {
    return 'Jamie Waite';
  }
  if (lowerNotes.includes('passed to adel') || lowerNotes.includes('adel mhiri')) {
    return 'Adel Mhiri';
  }
  
  return null;
}

async function fixAllDataIssues() {
  try {
    // Read and parse the CSV file
    const leadsData = fs.readFileSync(path.join(process.cwd(), 'Leads_1753352545.csv'));
    
    const leads = parse(leadsData, {
      columns: true,
      skip_empty_lines: true
    }) as LeadCSV[];

    console.log('Fixing all data issues...');

    for (const lead of leads) {
      // Skip empty rows
      if (!lead.Name || lead.Name.trim() === '') {
        continue;
      }

      // Find the lead in the database
      const existingLead = await prisma.lead.findFirst({
        where: {
          name: lead.Name
        }
      });

      if (existingLead) {
        // Determine the correct BDR
        let bdrValue = lead.BDR;
        
        // Check if there's a specific mapping for this lead
        if (bdrMappings[lead.Name]) {
          bdrValue = bdrMappings[lead.Name];
        } else {
          // Handle multiple BDRs - take the last one
          if (bdrValue && bdrValue.includes(',')) {
            bdrValue = getLastBDR(bdrValue);
          }
          
          // Check notes for BDR assignment
          const bdrFromNotes = getBDRFromNotes(lead.Notes);
          if (bdrFromNotes) {
            bdrValue = bdrFromNotes;
          }
        }
        
        // Fix company name
        let companyValue = lead.Company;
        if (companyFixes[lead.Company]) {
          companyValue = companyFixes[lead.Company];
        }
        
        // Update the lead with all fixes
        await prisma.lead.update({
          where: { id: existingLead.id },
          data: {
            bdr: bdrValue || null,
            title: lead.Title || existingLead.title,
            company: companyValue || existingLead.company,
            source: lead.Source || existingLead.source,
            status: lead.Status || existingLead.status,
            link: lead.Link || existingLead.link,
            phone: lead.Phone || existingLead.phone,
            email: lead.Email || existingLead.email,
            // Merge notes if there are new ones
            notes: lead.Notes ? 
              (existingLead.notes ? `${existingLead.notes}\n\n${lead.Notes}` : lead.Notes) : 
              existingLead.notes
          }
        });

        console.log(`Updated ${lead.Name} - BDR: ${bdrValue || 'null'} - Company: ${companyValue}`);
      } else {
        console.log(`Lead not found: ${lead.Name}`);
      }
    }

    console.log('All data issues fixed successfully');
  } catch (error) {
    console.error('Error fixing data issues:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllDataIssues(); 