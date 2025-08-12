const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { parse } = require('csv-parse/sync');

const prisma = new PrismaClient();

function readCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true
  });
}

function toNumber(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (s === '' || s.toLowerCase() === 'null') return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

function toBoolean(value) {
  if (value === undefined || value === null) return false;
  const s = String(value).trim().toLowerCase();
  if (s === 'true' || s === '1' || s === 'yes') return true;
  if (s === 'false' || s === '0' || s === 'no' || s === '') return false;
  return false;
}

function toDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  const d = new Date(s.replace('  ', ' '));
  return isNaN(d.getTime()) ? null : d;
}

function normalizeEmail(email) {
  if (!email) return null;
  const s = String(email).trim();
  return s || null;
}

function normalizeString(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  const s = String(value).trim();
  return s === '' ? fallback : s;
}

async function upsertUserByName(name) {
  const clean = normalizeString(name);
  if (!clean) return null;
  const email = `${clean.toLowerCase().replace(/\s+/g, '.')}@emg.com`;
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: clean,
      email,
      hashedPassword: '$2b$10$dummy.hash.for.backup.restoration',
      role: 'BDR',
      isActive: true
    }
  });
  return user;
}

async function createUsersFromBackups() {
  const base = path.join(__dirname, '../backup files from 7.8.25');
  const files = ['Lead.csv', 'PipelineItem.csv', 'ActivityLog.csv', 'FinanceEntry.csv']
    .map(f => path.join(base, f))
    .filter(f => fs.existsSync(f));

  const userNameSet = new Set();
  for (const file of files) {
    const rows = readCsv(file);
    for (const r of rows) {
      const bdrName = normalizeString(r.bdr);
      if (bdrName) userNameSet.add(bdrName);
    }
  }

  let created = 0;
  for (const name of userNameSet) {
    const u = await upsertUserByName(name);
    if (u) created++;
  }
  return created;
}

async function restoreLeads() {
  const file = path.join(__dirname, '../backup files from 7.8.25/Lead.csv');
  if (!fs.existsSync(file)) return { count: 0, leadIdMap: new Map() };
  const rows = readCsv(file);

  const leadIdMap = new Map(); // oldId -> newId
  let created = 0;

  for (const r of rows) {
    const oldId = toNumber(r.id);
    const bdrName = normalizeString(r.bdr);
    const user = await upsertUserByName(bdrName);

    const data = {
      name: normalizeString(r.name, ''),
      title: normalizeString(r.title),
      addedDate: toDate(r.addedDate) || new Date(),
      bdrId: user ? user.id : null,
      company: normalizeString(r.company),
      source: normalizeString(r.source, 'Unknown'),
      status: normalizeString(r.status, 'New Lead'),
      link: normalizeString(r.link),
      phone: normalizeString(r.phone),
      notes: normalizeString(r.notes),
      email: normalizeEmail(r.email)
    };

    try {
      const lead = await prisma.lead.create({ data });
      if (oldId != null) leadIdMap.set(oldId, lead.id);
      created++;
    } catch (e) {
      // If email conflict (unique), reuse existing lead
      if (data.email) {
        const existing = await prisma.lead.findUnique({ where: { email: data.email } });
        if (existing) {
          if (oldId != null) leadIdMap.set(oldId, existing.id);
          continue;
        }
      }
      console.warn('Lead create failed:', e.message);
    }
  }

  return { count: created, leadIdMap };
}

async function restorePipelineItems(leadIdMap) {
  const file = path.join(__dirname, '../backup files from 7.8.25/PipelineItem.csv');
  if (!fs.existsSync(file)) return { count: 0, updated: 0, pipelineIdMap: new Map() };
  const rows = readCsv(file);
  const total = rows.length;
  console.log(`[Pipeline] Total rows: ${total}`);

  const pipelineIdMap = new Map(); // oldId -> newId
  const pendingRelations = []; // { newId, oldLeadId, oldParentId }
  let created = 0;

  console.log('[Pipeline] First pass: creating items without relations...');
  // First pass: create items without parentId or leadId
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const oldId = toNumber(r.id);
    const bdrName = normalizeString(r.bdr);
    const user = await upsertUserByName(bdrName);
    if (!user) {
      console.warn('Skipping pipeline item due to missing user for BDR:', bdrName);
      continue;
    }

    // Idempotency: try to find an existing matching item
    const existing = await prisma.pipelineItem.findFirst({
      where: {
        bdrId: user.id,
        name: normalizeString(r.name, ''),
        status: normalizeString(r.status, 'New'),
        category: normalizeString(r.category, 'Pipeline'),
        company: normalizeString(r.company) || undefined
      }
    });

    if (existing) {
      if (oldId != null) pipelineIdMap.set(oldId, existing.id);
      pendingRelations.push({
        newId: existing.id,
        oldLeadId: toNumber(r.leadId),
        leadEmail: normalizeEmail(r.email),
        oldParentId: toNumber(r.parentId)
      });
      continue;
    }

    const data = {
      name: normalizeString(r.name, ''),
      title: normalizeString(r.title),
      addedDate: toDate(r.addedDate) || new Date(),
      lastUpdated: toDate(r.lastUpdated) || new Date(),
      bdrId: user.id,
      company: normalizeString(r.company),
      category: normalizeString(r.category, 'Pipeline'),
      status: normalizeString(r.status, 'New'),
      value: toNumber(r.value),
      probability: toNumber(r.probability),
      expectedCloseDate: toDate(r.expectedCloseDate),
      link: normalizeString(r.link),
      phone: normalizeString(r.phone),
      notes: normalizeString(r.notes),
      email: normalizeEmail(r.email),
      // relations deferred
      callDate: toDate(r.callDate),
      parentId: null,
      isSublist: toBoolean(r.isSublist),
      sublistName: normalizeString(r.sublistName),
      sortOrder: toNumber(r.sortOrder),
      agreementDate: toDate(r.agreementDate),
      partnerListDueDate: toDate(r.partnerListDueDate),
      partnerListSentDate: toDate(r.partnerListSentDate),
      firstSaleDate: toDate(r.firstSaleDate),
      partnerListSize: toNumber(r.partnerListSize),
      totalSalesFromList: toNumber(r.totalSalesFromList)
    };

    try {
      const createdItem = await prisma.pipelineItem.create({ data });
      if (oldId != null) pipelineIdMap.set(oldId, createdItem.id);
      pendingRelations.push({
        newId: createdItem.id,
        oldLeadId: toNumber(r.leadId),
        leadEmail: normalizeEmail(r.email),
        oldParentId: toNumber(r.parentId)
      });
      created++;
      if (created % 100 === 0 || created === total) {
        console.log(`[Pipeline] Created ${created}/${total}`);
      }
    } catch (e) {
      console.warn('PipelineItem create failed:', e.message);
    }
  }

  console.log(`Restored ${created} pipeline items`);

  // Second pass: set leadId and parentId using maps
  console.log('[Pipeline] Second pass: updating relations...');
  let updated = 0;
  for (let i = 0; i < pendingRelations.length; i++) {
    const rel = pendingRelations[i];
    let newLeadId = null;
    let newParentId = null;

    if (rel.oldLeadId != null) {
      const mapped = leadIdMap.get(rel.oldLeadId);
      if (mapped != null) newLeadId = mapped;
    } else if (rel.leadEmail) {
      // Attempt to match lead by email
      const lead = await prisma.lead.findUnique({ where: { email: rel.leadEmail } });
      if (lead) newLeadId = lead.id;
    }

    if (rel.oldParentId != null) {
      const mappedParent = pipelineIdMap.get(rel.oldParentId);
      if (mappedParent != null) newParentId = mappedParent;
    }

    const updateData = {};
    if (newLeadId != null) updateData.leadId = newLeadId;
    if (newParentId != null) updateData.parentId = newParentId;

    if (Object.keys(updateData).length === 0) continue; // nothing to update safely

    try {
      await prisma.pipelineItem.update({
        where: { id: rel.newId },
        data: updateData
      });
      updated++;
      if (updated % 200 === 0 || updated === pendingRelations.length) {
        console.log(`[Pipeline] Relations updated ${updated}/${pendingRelations.length}`);
      }
    } catch (e) {
      console.warn('PipelineItem relation update failed:', e.message);
    }
  }

  return { count: created, updated, pipelineIdMap };
}

async function restoreActivityLogs(leadIdMap, pipelineIdMap) {
  const file = path.join(__dirname, '../backup files from 7.8.25/ActivityLog.csv');
  if (!fs.existsSync(file)) return { count: 0 };
  const rows = readCsv(file);

  let created = 0;
  for (const r of rows) {
    const bdrName = normalizeString(r.bdr);
    const user = await upsertUserByName(bdrName);
    if (!user) {
      console.warn('Skipping activity log due to missing user for BDR:', bdrName);
      continue;
    }

    const oldLeadId = toNumber(r.leadId);
    const oldPipelineId = toNumber(r.pipelineItemId);

    const data = {
      timestamp: toDate(r.timestamp) || new Date(),
      bdrId: user.id,
      activityType: normalizeString(r.activityType, 'Note'),
      description: normalizeString(r.description, ''),
      scheduledDate: toDate(r.scheduledDate),
      completedDate: toDate(r.completedDate),
      notes: normalizeString(r.notes),
      leadId: oldLeadId != null ? (leadIdMap.get(oldLeadId) ?? null) : null,
      pipelineItemId: oldPipelineId != null ? (pipelineIdMap.get(oldPipelineId) ?? null) : null,
      previousStatus: normalizeString(r.previousStatus),
      newStatus: normalizeString(r.newStatus),
      previousCategory: normalizeString(r.previousCategory),
      newCategory: normalizeString(r.newCategory)
    };

    // Idempotency: check if such log likely exists already
    const exists = await prisma.activityLog.findFirst({
      where: {
        bdrId: data.bdrId,
        timestamp: data.timestamp,
        activityType: data.activityType,
        description: data.description
      }
    });
    if (exists) continue;

    try {
      await prisma.activityLog.create({ data });
      created++;
    } catch (e) {
      console.warn('ActivityLog create failed:', e.message);
    }
  }
  return { count: created };
}

async function restoreFinanceEntries() {
  const file = path.join(__dirname, '../backup files from 7.8.25/FinanceEntry.csv');
  if (!fs.existsSync(file)) return { count: 0 };
  const rows = readCsv(file);

  let created = 0;
  for (const r of rows) {
    const bdrName = normalizeString(r.bdr);
    const user = await upsertUserByName(bdrName);
    if (!user) {
      console.warn('Skipping finance entry due to missing user for BDR:', bdrName);
      continue;
    }

    const data = {
      company: normalizeString(r.company, ''),
      bdrId: user.id,
      leadGen: toBoolean(r.leadGen),
      status: normalizeString(r.status, 'Invoiced'),
      invoiceDate: toDate(r.invoiceDate),
      dueDate: toDate(r.dueDate),
      soldAmount: toNumber(r.soldAmount),
      gbpAmount: toNumber(r.gbpAmount),
      exchangeRate: toNumber(r.exchangeRate),
      exchangeRateDate: toDate(r.exchangeRateDate),
      actualGbpReceived: toNumber(r.actualGbpReceived),
      notes: normalizeString(r.notes),
      commissionPaid: toBoolean(r.commissionPaid),
      month: normalizeString(r.month, '2025-01'),
      createdAt: toDate(r.createdAt) || undefined,
      updatedAt: toDate(r.updatedAt) || undefined
    };

    try {
      await prisma.financeEntry.create({ data });
      created++;
    } catch (e) {
      console.warn('FinanceEntry create failed:', e.message);
    }
  }
  return { count: created };
}

async function restoreKpiTargets() {
  const file = path.join(__dirname, '../backup files from 7.8.25/KpiTarget.csv');
  if (!fs.existsSync(file)) return { count: 0 };
  const rows = readCsv(file);

  let upserts = 0;
  for (const r of rows) {
    const name = normalizeString(r.name);
    const value = toNumber(r.value) ?? 0;
    if (!name) continue;

    try {
      await prisma.kpiTarget.upsert({
        where: { name },
        update: { value },
        create: { name, value }
      });
      upserts++;
    } catch (e) {
      console.warn('KpiTarget upsert failed:', e.message);
    }
  }
  return { count: upserts };
}

async function backfillPipelineLeadsFromEmail() {
  console.log('[Backfill] Linking pipeline items to leads by email...');
  const pageSize = 500;
  let processed = 0;
  let linked = 0;
  // Paginate through items needing leadId but with email
  // Simple loop with cursor-based pagination
  let lastId = 0;
  // Count first for logging
  const totalNeeding = await prisma.pipelineItem.count({ where: { leadId: null, NOT: { email: null } } });
  console.log(`[Backfill] Items needing lead link: ${totalNeeding}`);

  while (true) {
    const items = await prisma.pipelineItem.findMany({
      where: { id: { gt: lastId }, leadId: null, NOT: { email: null } },
      orderBy: { id: 'asc' },
      take: pageSize,
      select: { id: true, name: true, email: true, bdrId: true, company: true, addedDate: true }
    });
    if (items.length === 0) break;

    for (const item of items) {
      lastId = item.id;
      if (!item.email) continue;
      // Upsert lead by email
      let lead = await prisma.lead.findUnique({ where: { email: item.email } });
      if (!lead) {
        try {
          lead = await prisma.lead.create({
            data: {
              name: item.name || 'Unknown',
              email: item.email,
              bdrId: item.bdrId,
              company: item.company || null,
              source: 'Backfill',
              status: 'New Lead',
              addedDate: item.addedDate || new Date()
            }
          });
        } catch (_) {
          // In case of race/unique conflict, re-read
          lead = await prisma.lead.findUnique({ where: { email: item.email } });
        }
      }
      if (lead) {
        await prisma.pipelineItem.update({ where: { id: item.id }, data: { leadId: lead.id } });
        linked++;
      }
    }
    processed += items.length;
    console.log(`[Backfill] Processed ${processed}/${totalNeeding}, linked so far: ${linked}`);
  }
  console.log(`[Backfill] Lead links created: ${linked}`);
}

async function backfillActivityLeadFromPipeline() {
  console.log('[Backfill] Propagating leadId to activity logs from pipeline items...');
  const pageSize = 1000;
  let processed = 0;
  let updated = 0;
  let lastId = 0;
  const total = await prisma.activityLog.count({ where: { leadId: null, NOT: { pipelineItemId: null } } });
  console.log(`[Backfill] Activity logs needing leadId from pipeline: ${total}`);
  while (true) {
    const logs = await prisma.activityLog.findMany({
      where: { id: { gt: lastId }, leadId: null, NOT: { pipelineItemId: null } },
      orderBy: { id: 'asc' },
      take: pageSize,
      select: { id: true, pipelineItemId: true }
    });
    if (logs.length === 0) break;

    const pipelineIds = logs.map(l => l.pipelineItemId).filter(Boolean);
    const pipelines = await prisma.pipelineItem.findMany({
      where: { id: { in: pipelineIds } },
      select: { id: true, leadId: true }
    });
    const idToLead = new Map(pipelines.map(p => [p.id, p.leadId]));

    for (const log of logs) {
      lastId = log.id;
      const leadId = idToLead.get(log.pipelineItemId);
      if (leadId) {
        await prisma.activityLog.update({ where: { id: log.id }, data: { leadId } });
        updated++;
      }
    }
    processed += logs.length;
    console.log(`[Backfill] Processed ${processed}/${total}, updated: ${updated}`);
  }
  console.log(`[Backfill] Activity logs updated with leadId: ${updated}`);
}

// In restore flow, run backfills after primary imports
async function restore() {
  console.log('Ensuring users exist...');
  const usersCreated = await createUsersFromBackups();
  console.log(`Users ensured/created: ${usersCreated}`);

  console.log('Restoring leads...');
  const { count: leadsCount, leadIdMap } = await restoreLeads();
  console.log(`Leads restored: ${leadsCount}`);

  console.log('Restoring pipeline items...');
  const { count: pipelineCount, updated: pipelineUpdated, pipelineIdMap } = await restorePipelineItems(leadIdMap);
  console.log(`Pipeline items restored: ${pipelineCount}, relations updated: ${pipelineUpdated}`);

  console.log('Restoring activity logs...');
  const { count: activityCount } = await restoreActivityLogs(leadIdMap, pipelineIdMap);
  console.log(`Activity logs restored: ${activityCount}`);

  console.log('Restoring finance entries...');
  const { count: financeCount } = await restoreFinanceEntries();
  console.log(`Finance entries restored: ${financeCount}`);

  console.log('Restoring KPI targets...');
  const { count: kpiCount } = await restoreKpiTargets();
  console.log(`KPI targets upserted: ${kpiCount}`);

  // Backfills
  await backfillPipelineLeadsFromEmail();
  await backfillActivityLeadFromPipeline();
}

restore()
  .then(() => console.log('Database restoration completed.'))
  .catch((err) => {
    console.error('Restoration failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
