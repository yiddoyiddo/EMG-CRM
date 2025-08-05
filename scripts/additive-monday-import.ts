import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MondayLead {
  Name: string;
  Title?: string;
  Company?: string;
  Date?: number | string;
  'Date Stage Updated'?: number | string;
  'Last Date Stage Updated'?: number | string;
  Stage?: string;
  'Notes - USE FOR UPDATES + ADD DATE OF UPDATE'?: string;
  Phone?: string;
  Email?: string;
  Linkedin?: string;
  Subitems?: string;
}

interface MondayUpdate {
  'Item ID': string;
  'Item Name': string;
  'Content Type': string;
  User: string;
  'Created At': string;
  'Update Content': string;
  'Likes Count': number;
  'Post ID': string;
  'Parent Post ID'?: string;
}

interface ExtractedDate {
  date: Date;
  text: string;
  type: 'due' | 'waiting' | 'chase' | 'call' | 'meeting' | 'update' | 'deadline';
}

// Convert Excel serial date to JavaScript Date
function excelDateToJSDate(serial: number): Date {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
}

// Parse Monday date format: "02/July/2025  01:03:56 PM"
function parseMondayDate(dateStr: string): Date {
  const [datePart, timePart] = dateStr.split('  ');
  const [day, month, year] = datePart.split('/');
  const [time, ampm] = timePart.split(' ');
  const [hours, minutes, seconds] = time.split(':');

  const monthMap: Record<string, number> = {
    'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
    'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11,
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
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

// Extract dates from notes with various formats
function extractDatesFromNotes(notes: string): ExtractedDate[] {
  if (!notes) return [];
  
  const extractedDates: ExtractedDate[] = [];
  
  // Common date patterns
  const patterns = [
    // Format: "List due 14/7"
    { regex: /(?:list|report|document|proposal|quote)\s+due\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/gi, type: 'due' as const },
    
    // Format: "Waiting until (15-07-25)" or "Waiting until (15/07/2025)"
    { regex: /waiting\s+until\s+\((\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\)/gi, type: 'waiting' as const },
    
    // Format: "1/7 chased" or "2/8 contacted"
    { regex: /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+(?:chased|contacted|called|emailed|followed up)/gi, type: 'chase' as const },
    
    // Format: "Call booked 15/7" or "Meeting 20/8"
    { regex: /(?:call|meeting)\s+(?:booked\s+)?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/gi, type: 'call' as const },
    
    // Format: "Deadline: 30/7" or "Due: 15/8"
    { regex: /(?:deadline|due):\s*(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/gi, type: 'deadline' as const },
    
    // Format: "UPDATE 5/7:" or "5/7 UPDATE:"
    { regex: /(?:update\s+)?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*(?:update|:)/gi, type: 'update' as const },
    
    // Format: "PROMISED (28-06-2025)"
    { regex: /promised\s+\((\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\)/gi, type: 'deadline' as const }
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.regex.exec(notes)) !== null) {
      const dateStr = match[1];
      const parsedDate = parseFlexibleDate(dateStr);
      if (parsedDate) {
        extractedDates.push({
          date: parsedDate,
          text: match[0],
          type: pattern.type
        });
      }
    }
  }
  
  return extractedDates;
}

// Parse various date formats flexibly
function parseFlexibleDate(dateStr: string): Date | null {
  try {
    // Remove any extra spaces and normalize separators
    const cleanDate = dateStr.trim().replace(/[-]/g, '/');
    
    // Handle formats: d/m, d/m/yy, d/m/yyyy
    const parts = cleanDate.split('/');
    if (parts.length < 2 || parts.length > 3) return null;
    
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    let year = new Date().getFullYear(); // Default to current year
    
    if (parts.length === 3) {
      year = parseInt(parts[2]);
      // Handle 2-digit years
      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }
    }
    
    // Validate ranges
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;
    
    return new Date(year, month - 1, day);
  } catch (error) {
    console.log(`Failed to parse date: ${dateStr}`, error);
    return null;
  }
}

// Map Monday stages to pipeline categories
function mapStageToCategory(stage: string): string {
  const stageMap: Record<string, string> = {
    'Agreement - Profiles': 'Agreement',
    'Agreement - Profile': 'Agreement', 
    'Agreement': 'Agreement',
    'Agreement - Media Sales': 'Agreement',
    'Finished - Sold on': 'Agreement',
    'Sold': 'Agreement',
    'Proposal - Profile': 'Proposal',
    'Proposal - Profiles': 'Proposal',
    'Proposal': 'Proposal',
    'Proposal - Media': 'Proposal',
    'Discovery Call': 'Calls',
    'Discovery': 'Calls',
    'Call Proposed': 'Calls',
    'Call Booked': 'Calls',
    'Qualification': 'Qualification',
    'Negotiation': 'Proposal',
    'Closed Won': 'Agreement',
    'Closed Lost': 'Declined_Rescheduled',
    'Declined': 'Declined_Rescheduled',
    'Rescheduled': 'Declined_Rescheduled',
    'Follow Up': 'Qualification',
    'Initial Contact': 'Qualification',
    'Demo': 'Calls',
    'Pitch': 'Proposal',
    'List Due': 'Lists_Media_QA',
    'List Out': 'Lists_Media_QA',
    'Media': 'Lists_Media_QA',
    'Q&A': 'Lists_Media_QA',
    'QA': 'Lists_Media_QA'
  };

  // Direct match first
  if (stageMap[stage]) {
    return stageMap[stage];
  }

  // Partial match
  for (const [key, value] of Object.entries(stageMap)) {
    if (stage.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(stage.toLowerCase())) {
      return value;
    }
  }

  // Default based on content
  if (stage.toLowerCase().includes('agreement') || stage.toLowerCase().includes('won') || stage.toLowerCase().includes('sold')) {
    return 'Agreement';
  }
  if (stage.toLowerCase().includes('proposal')) {
    return 'Proposal';
  }
  if (stage.toLowerCase().includes('call') || stage.toLowerCase().includes('discovery')) {
    return 'Calls';
  }
  if (stage.toLowerCase().includes('declined') || stage.toLowerCase().includes('lost') || stage.toLowerCase().includes('rescheduled')) {
    return 'Declined_Rescheduled';
  }

  return 'Qualification';
}

// Determine if this should be a Lead or Pipeline Item
function shouldBeLeadVsPipeline(stage: string, category: string): 'lead' | 'pipeline' {
  // Very early stages should be leads
  if (stage.toLowerCase().includes('qualification') || 
      stage.toLowerCase().includes('initial') ||
      category === 'Qualification') {
    return 'lead';
  }
  
  // Advanced stages should be pipeline items
  if (category === 'Agreement' || 
      category === 'Proposal' || 
      category === 'Calls' || 
      category === 'Lists_Media_QA') {
    return 'pipeline';
  }
  
  // Default to pipeline for anything else
  return 'pipeline';
}

// Create backup before import
async function createBackup() {
  console.log('📁 Creating backup before additive import...');
  const backupData = {
    timestamp: new Date().toISOString(),
    leads: await prisma.lead.findMany(),
    pipelineItems: await prisma.pipelineItem.findMany(),
    activityLogs: await prisma.activityLog.findMany()
  };
  
  const backupPath = `backup/pre-additive-backup-${Date.now()}.json`;
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  console.log(`✅ Backup created: ${backupPath}`);
  return backupPath;
}

async function additiveImport() {
  try {
    console.log('🚀 Starting Additive Monday.com Import (Non-Destructive)');
    console.log('=' .repeat(60));

    // Create backup first
    await createBackup();

    // Check current state
    const currentLeads = await prisma.lead.count();
    const currentPipeline = await prisma.pipelineItem.count();
    const currentActivity = await prisma.activityLog.count();
    
    console.log('📊 Current Database State:');
    console.log(`   Leads: ${currentLeads}`);
    console.log(`   Pipeline Items: ${currentPipeline}`);
    console.log(`   Activity Logs: ${currentActivity}`);

    const mondayDir = path.join(process.cwd(), 'mondaypipelineleads');
    const files = fs.readdirSync(mondayDir).filter(file => file.endsWith('.xlsx'));

    let totalLeadsAdded = 0;
    let totalPipelineAdded = 0;
    let totalActivityLogs = 0;
    let totalSkipped = 0;

    // Get existing emails to avoid duplicates
    const existingEmails = new Set();
    const existingLeadEmails = await prisma.lead.findMany({ 
      where: { email: { not: null } }, 
      select: { email: true } 
    });
    const existingPipelineEmails = await prisma.pipelineItem.findMany({ 
      where: { email: { not: null } }, 
      select: { email: true } 
    });
    
    existingLeadEmails.forEach(l => l.email && existingEmails.add(l.email.toLowerCase()));
    existingPipelineEmails.forEach(p => p.email && existingEmails.add(p.email.toLowerCase()));

    for (const file of files) {
      console.log(`\n=== Processing ${file} ===`);
      
      // Extract BDR name from filename
      const bdrName = file.replace(/[_\d\.xlsx]/g, '').replace(/([A-Z])/g, ' $1').trim();
      console.log(`BDR: ${bdrName}`);
      
      const filePath = path.join(mondayDir, file);
      const workbook = XLSX.readFile(filePath);
      
      // Find main data sheet and updates sheet
      const mainSheetName = workbook.SheetNames.find(name => !name.includes('update')) || workbook.SheetNames[0];
      const updatesSheetName = workbook.SheetNames.find(name => name.includes('update'));
      
      console.log(`Main sheet: ${mainSheetName}`);
      console.log(`Updates sheet: ${updatesSheetName || 'None'}`);
      
      // Read main data (starting from row 5, as row 4 has headers)
      const mainWorksheet = workbook.Sheets[mainSheetName];
      const mainData = XLSX.utils.sheet_to_json(mainWorksheet, {
        range: 4, // Start from row 5 (0-indexed)
        defval: null
      }) as MondayLead[];
      
      // Read updates if available
      let updatesData: MondayUpdate[] = [];
      if (updatesSheetName) {
        const updatesWorksheet = workbook.Sheets[updatesSheetName];
        updatesData = XLSX.utils.sheet_to_json(updatesWorksheet, {
          range: 1, // Skip first row
          defval: null
        }) as MondayUpdate[];
      }
      
      // Group updates by item name
      const updatesByName = new Map<string, MondayUpdate[]>();
      updatesData.forEach(update => {
        const name = update['Item Name'];
        if (!updatesByName.has(name)) {
          updatesByName.set(name, []);
        }
        updatesByName.get(name)?.push(update);
      });
      
      console.log(`Found ${mainData.length} leads and ${updatesData.length} updates`);
      
      // Process each lead
      for (const leadData of mainData) {
        if (!leadData.Name || 
            leadData.Name.trim() === '' || 
            leadData.Name === 'Subitems' ||
            leadData.Name === 'Name' ||
            leadData.Name.includes('USE DATE COLUMN FOR WHAT DATE THE CALL IS BOOKED FOR') ||
            leadData.Name.includes('Lists, Media Sales, Q&A') ||
            leadData.Name.includes('Declined, Rescheduled')) {
          continue;
        }
        
        const name = leadData.Name.trim();
        const email = leadData.Email?.trim().toLowerCase() || null;
        const company = leadData.Company?.trim() || null;
        const title = leadData.Title?.trim() || null;
        const phone = leadData.Phone?.toString().trim() || null;
        const linkedin = leadData.Linkedin?.trim() || null;
        const notes = leadData['Notes - USE FOR UPDATES + ADD DATE OF UPDATE']?.trim() || null;
        const stage = leadData.Stage?.trim() || 'Qualification';
        const category = mapStageToCategory(stage);
        const recordType = shouldBeLeadVsPipeline(stage, category);
        
        // Skip if email already exists
        if (email && existingEmails.has(email)) {
          console.log(`   ⏭️  Skipping ${name} (email ${email} already exists)`);
          totalSkipped++;
          continue;
        }
        
        // Parse dates
        let addedDate = new Date();
        let callDate: Date | null = null;
        let lastUpdated = new Date();
        
        // Handle call booking date (Date field represents when call is/was booked for)
        if (leadData.Date && typeof leadData.Date === 'number') {
          callDate = excelDateToJSDate(leadData.Date);
          addedDate = callDate; // Use call date as initial date
        }
        
        // Handle last updated date
        if (leadData['Last Date Stage Updated'] && typeof leadData['Last Date Stage Updated'] === 'number') {
          lastUpdated = excelDateToJSDate(leadData['Last Date Stage Updated']);
        } else if (leadData['Date Stage Updated'] && typeof leadData['Date Stage Updated'] === 'number') {
          lastUpdated = excelDateToJSDate(leadData['Date Stage Updated']);
        }
        
        console.log(`\n📋 Processing: ${name} @ ${company} (${stage}) → ${recordType.toUpperCase()}`);
        
        // Extract dates from notes for activity logs
        const extractedDates = extractDatesFromNotes(notes || '');
        
        let recordId: number;
        
        if (recordType === 'lead') {
          // Create as Lead
          const lead = await prisma.lead.create({
            data: {
              name,
              title,
              company,
              bdr: bdrName,
              source: 'Monday.com Import',
              status: 'Active',
              email,
              phone,
              link: linkedin,
              notes,
              addedDate
            }
          });
          recordId = lead.id;
          totalLeadsAdded++;
          
          // Create activity logs for lead
          for (const extractedDate of extractedDates) {
            await prisma.activityLog.create({
              data: {
                bdr: bdrName,
                activityType: extractedDate.type === 'due' ? 'Due Date' : 
                             extractedDate.type === 'waiting' ? 'Waiting Period' :
                             extractedDate.type === 'chase' ? 'Follow Up' :
                             extractedDate.type === 'call' ? 'Call Scheduled' :
                             extractedDate.type === 'deadline' ? 'Deadline' : 'Update',
                description: `Extracted from notes: ${extractedDate.text}`,
                scheduledDate: extractedDate.date,
                leadId: recordId,
                timestamp: extractedDate.date
              }
            });
            totalActivityLogs++;
          }
          
          console.log(`   ✅ Created lead ID ${recordId} with ${extractedDates.length} extracted activity logs`);
          
        } else {
          // Create as Pipeline Item
          const pipelineItem = await prisma.pipelineItem.create({
            data: {
              name,
              title,
              company,
              bdr: bdrName,
              category,
              status: 'Active',
              email,
              phone,
              link: linkedin,
              notes,
              addedDate,
              lastUpdated,
              callDate: callDate || undefined,
              probability: category === 'Agreement' ? 90 : category === 'Proposal' ? 70 : category === 'Calls' ? 40 : 20,
              value: category === 'Agreement' ? 25000 : category === 'Proposal' ? 20000 : 15000
            }
          });
          recordId = pipelineItem.id;
          totalPipelineAdded++;
          
          // Create activity logs for pipeline item
          for (const extractedDate of extractedDates) {
            await prisma.activityLog.create({
              data: {
                bdr: bdrName,
                activityType: extractedDate.type === 'due' ? 'Due Date' : 
                             extractedDate.type === 'waiting' ? 'Waiting Period' :
                             extractedDate.type === 'chase' ? 'Follow Up' :
                             extractedDate.type === 'call' ? 'Call Scheduled' :
                             extractedDate.type === 'deadline' ? 'Deadline' : 'Update',
                description: `Extracted from notes: ${extractedDate.text}`,
                scheduledDate: extractedDate.date,
                pipelineItemId: recordId,
                timestamp: extractedDate.date
              }
            });
            totalActivityLogs++;
          }
          
          console.log(`   ✅ Created pipeline item ID ${recordId} with ${extractedDates.length} extracted activity logs`);
        }
        
        // Create activity logs from Monday updates
        const itemUpdates = updatesByName.get(name) || [];
        for (const update of itemUpdates) {
          let createdAt = new Date();
          try {
            createdAt = parseMondayDate(update['Created At']);
          } catch (error) {
            console.log(`Failed to parse update date: ${update['Created At']}`);
          }
          
          await prisma.activityLog.create({
            data: {
              bdr: update.User || bdrName,
              activityType: 'Update',
              description: update['Update Content'] || 'Monday.com update',
              leadId: recordType === 'lead' ? recordId : null,
              pipelineItemId: recordType === 'pipeline' ? recordId : null,
              timestamp: createdAt
            }
          });
          totalActivityLogs++;
        }
        
        if (itemUpdates.length > 0) {
          console.log(`   📝 Added ${itemUpdates.length} Monday.com update logs`);
        }
        
        // Add email to existing set to avoid future duplicates
        if (email) {
          existingEmails.add(email);
        }
      }
    }
    
    // Final verification
    const finalLeads = await prisma.lead.count();
    const finalPipeline = await prisma.pipelineItem.count();
    const finalActivity = await prisma.activityLog.count();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Additive Import Completed Successfully!');
    console.log('\n📊 RESULTS:');
    console.log(`   New Leads Added: ${totalLeadsAdded}`);
    console.log(`   New Pipeline Items Added: ${totalPipelineAdded}`);
    console.log(`   New Activity Logs Created: ${totalActivityLogs}`);
    console.log(`   Records Skipped (duplicates): ${totalSkipped}`);
    console.log('\n📈 TOTALS:');
    console.log(`   Total Leads: ${finalLeads} (was ${currentLeads})`);
    console.log(`   Total Pipeline Items: ${finalPipeline} (was ${currentPipeline})`);
    console.log(`   Total Activity Logs: ${finalActivity} (was ${currentActivity})`);
    
  } catch (error) {
    console.error('❌ Error during additive import:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
additiveImport(); 