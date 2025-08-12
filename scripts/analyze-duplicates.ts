import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DuplicateAnalysis {
  table: string;
  field: string;
  duplicates: any[];
  totalRecords: number;
  duplicateGroups: number;
  affectedRecords: number;
}

async function analyzeDuplicates() {
  try {
    console.log('🔍 Comprehensive Duplicate Analysis\n');
    console.log('=' .repeat(50));

    const analyses: DuplicateAnalysis[] = [];

    // 1. Check for Lead duplicates by different criteria
    console.log('\n📊 LEADS TABLE ANALYSIS');
    console.log('-'.repeat(30));

    // Check duplicates by email (should be unique according to schema)
    const emailDuplicates = await prisma.$queryRaw`
      SELECT email, COUNT(*) as count, GROUP_CONCAT(id) as ids
      FROM "Lead"
      WHERE email IS NOT NULL AND email != ''
      GROUP BY email
      HAVING COUNT(*) > 1
    ` as any[];

    console.log(`\n📧 Email duplicates: ${emailDuplicates.length} groups`);
    if (emailDuplicates.length > 0) {
      emailDuplicates.forEach(dup => {
        console.log(`  Email: ${dup.email} | Count: ${dup.count} | IDs: [${dup.ids}]`);
      });
    }

    // Check duplicates by name
    const nameDuplicates = await prisma.$queryRaw`
      SELECT name, COUNT(*) as count, GROUP_CONCAT(id) as ids
      FROM "Lead"
      GROUP BY name
      HAVING COUNT(*) > 1
    ` as any[];

    console.log(`\n👤 Name duplicates: ${nameDuplicates.length} groups`);
    if (nameDuplicates.length > 0) {
      nameDuplicates.forEach(dup => {
        console.log(`  Name: ${dup.name} | Count: ${dup.count} | IDs: [${dup.ids}]`);
      });
    }

    // Check duplicates by name + company combination
    const nameCompanyDuplicates = await prisma.$queryRaw`
      SELECT name, company, COUNT(*) as count, GROUP_CONCAT(id) as ids
      FROM "Lead"
      GROUP BY name, company
      HAVING COUNT(*) > 1
    ` as any[];

    console.log(`\n🏢 Name + Company duplicates: ${nameCompanyDuplicates.length} groups`);
    if (nameCompanyDuplicates.length > 0) {
      nameCompanyDuplicates.forEach(dup => {
        console.log(`  Name: ${dup.name} | Company: ${dup.company} | Count: ${dup.count} | IDs: [${dup.ids}]`);
      });
    }

    // Check for phone duplicates
    const phoneDuplicates = await prisma.$queryRaw`
      SELECT phone, COUNT(*) as count, GROUP_CONCAT(id) as ids
      FROM "Lead"
      WHERE phone IS NOT NULL AND phone != ''
      GROUP BY phone
      HAVING COUNT(*) > 1
    ` as any[];

    console.log(`\n📞 Phone duplicates: ${phoneDuplicates.length} groups`);
    if (phoneDuplicates.length > 0) {
      phoneDuplicates.forEach(dup => {
        console.log(`  Phone: ${dup.phone} | Count: ${dup.count} | IDs: [${dup.ids}]`);
      });
    }

    // 2. Check for PipelineItem duplicates
    console.log('\n\n📊 PIPELINE ITEMS TABLE ANALYSIS');
    console.log('-'.repeat(30));

    // Check duplicates by email
    const pipelineEmailDuplicates = await prisma.$queryRaw`
      SELECT email, COUNT(*) as count, GROUP_CONCAT(id) as ids
      FROM "PipelineItem"
      WHERE email IS NOT NULL AND email != ''
      GROUP BY email
      HAVING COUNT(*) > 1
    ` as any[];

    console.log(`\n📧 Pipeline Email duplicates: ${pipelineEmailDuplicates.length} groups`);
    if (pipelineEmailDuplicates.length > 0) {
      pipelineEmailDuplicates.forEach(dup => {
        console.log(`  Email: ${dup.email} | Count: ${dup.count} | IDs: [${dup.ids}]`);
      });
    }

    // Check duplicates by name + company
    const pipelineNameCompanyDuplicates = await prisma.$queryRaw`
      SELECT name, company, COUNT(*) as count, GROUP_CONCAT(id) as ids
      FROM "PipelineItem"
      GROUP BY name, company
      HAVING COUNT(*) > 1
    ` as any[];

    console.log(`\n🏢 Pipeline Name + Company duplicates: ${pipelineNameCompanyDuplicates.length} groups`);
    if (pipelineNameCompanyDuplicates.length > 0) {
      pipelineNameCompanyDuplicates.forEach(dup => {
        console.log(`  Name: ${dup.name} | Company: ${dup.company} | Count: ${dup.count} | IDs: [${dup.ids}]`);
      });
    }

    // 3. Check for cross-table duplicates (same person in both Lead and PipelineItem)
    console.log('\n\n📊 CROSS-TABLE ANALYSIS');
    console.log('-'.repeat(30));

    const crossTableEmailDuplicates = await prisma.$queryRaw`
      SELECT 
        l.email,
        l.id as lead_id,
        l.name as lead_name,
        l.company as lead_company,
        p.id as pipeline_id,
        p.name as pipeline_name,
        p.company as pipeline_company
      FROM "Lead" l
      INNER JOIN "PipelineItem" p ON l.email = p.email
      WHERE l.email IS NOT NULL AND l.email != ''
      ORDER BY l.email
    ` as any[];

    console.log(`\n📧 Same email in Lead and Pipeline: ${crossTableEmailDuplicates.length} matches`);
    if (crossTableEmailDuplicates.length > 0) {
      crossTableEmailDuplicates.forEach(match => {
        console.log(`  Email: ${match.email}`);
        console.log(`    Lead: ID ${match.lead_id} - ${match.lead_name} @ ${match.lead_company}`);
        console.log(`    Pipeline: ID ${match.pipeline_id} - ${match.pipeline_name} @ ${match.pipeline_company}`);
        console.log('');
      });
    }

    // 4. Check for records that look like duplicates but have different emails
    const potentialNameDuplicates = await prisma.$queryRaw`
      SELECT 
        l1.name,
        l1.company,
        l1.id as id1,
        l1.email as email1,
        l2.id as id2,
        l2.email as email2
      FROM "Lead" l1
      INNER JOIN "Lead" l2 ON l1.name = l2.name AND l1.company = l2.company
      WHERE l1.id < l2.id
        AND (l1.email != l2.email OR (l1.email IS NULL AND l2.email IS NOT NULL) OR (l1.email IS NOT NULL AND l2.email IS NULL))
      ORDER BY l1.name, l1.company
    ` as any[];

    console.log(`\n🤔 Potential duplicates with different emails: ${potentialNameDuplicates.length} pairs`);
    if (potentialNameDuplicates.length > 0) {
      potentialNameDuplicates.forEach(dup => {
        console.log(`  ${dup.name} @ ${dup.company}`);
        console.log(`    ID ${dup.id1}: ${dup.email1 || 'No email'}`);
        console.log(`    ID ${dup.id2}: ${dup.email2 || 'No email'}`);
        console.log('');
      });
    }

    // 5. Summary statistics
    console.log('\n\n📈 SUMMARY STATISTICS');
    console.log('-'.repeat(30));

    const leadCount = await prisma.lead.count();
    const pipelineCount = await prisma.pipelineItem.count();
    const activityLogCount = await prisma.activityLog.count();

    console.log(`Total Leads: ${leadCount}`);
    console.log(`Total Pipeline Items: ${pipelineCount}`);
    console.log(`Total Activity Logs: ${activityLogCount}`);

    const leadsWithEmail = await prisma.lead.count({
      where: {
        AND: [
          { email: { not: null } },
          { email: { not: '' } }
        ]
      }
    });

    const pipelineWithEmail = await prisma.pipelineItem.count({
      where: {
        AND: [
          { email: { not: null } },
          { email: { not: '' } }
        ]
      }
    });

    console.log(`Leads with email: ${leadsWithEmail}`);
    console.log(`Pipeline items with email: ${pipelineWithEmail}`);

    // 6. Orphaned activity logs check
    const orphanedActivityLogs = await prisma.$queryRaw`
      SELECT a.id, a.leadId, a.pipelineItemId
      FROM "ActivityLog" a
      LEFT JOIN "Lead" l ON a.leadId = l.id
      LEFT JOIN "PipelineItem" p ON a.pipelineItemId = p.id
      WHERE (a.leadId IS NOT NULL AND l.id IS NULL)
         OR (a.pipelineItemId IS NOT NULL AND p.id IS NULL)
    ` as any[];

    console.log(`\n🔗 Orphaned activity logs: ${orphanedActivityLogs.length}`);
    if (orphanedActivityLogs.length > 0) {
      orphanedActivityLogs.forEach(log => {
        console.log(`  Activity Log ID ${log.id} - Lead: ${log.leadId}, Pipeline: ${log.pipelineItemId}`);
      });
    }

    console.log('\n' + '='.repeat(50));
    console.log('Analysis complete! 🎉');

  } catch (error) {
    console.error('Error during analysis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeDuplicates(); 