import { z } from "zod";

// Define the valid options for source and status
export const leadSourceEnum = ["LinkedIn", "Email", "Phone", "Lead Gen Team", "Referral", "Other"] as const;

// Enhanced lead statuses that align with actual sales process
export const leadStatusEnum = [
  "BDR Followed Up",
  "Call Proposed", 
  "Call Booked",
  "Call Conducted",
  "Passed Over",
  "DECLINED",
  "Proposal - Profile",
  "Proposal - Media Sales", 
  "Agreement - Profile",
  "Agreement - Media",
  "Partner List Pending",
  "Partner List Sent",
  "List Out",
  "List Out - Not Sold",
  "Free Q&A Offered",
  "Sold"
] as const;

export const leadBdrEnum = [
  "Dan Reeves",
  "Jess Collins", 
  "Jamie Waite",
  "Stephen Vivian",
  "Thomas Hardy",
  "Adel Mhiri",
  "Gary Smith",
  "Naeem Patel",
  "Jennifer Davies",
  "Verity Kay",
  "Rupert Kay",
  "Mark Cawston",
  "Thomas Corcoran"
] as const;

// Enhanced activity types for comprehensive tracking
export const activityTypeEnum = [
  "Call_Proposed",
  "Call_Scheduled",
  "Call_Completed",
  "Call_Missed",
  "Call_Rescheduled", 
  "Proposal_Sent",
  "Agreement_Sent",
  "Partner_List_Sent",
  "Status_Change",
  "Pipeline_Move",
  "Email_Sent",
  "Note_Added",
  "Value_Updated",
  "Lead_Created",
  "Lead_Converted",
  "BDR_Update",
  "Partner_Added",
  "Sale_Recorded",
  "Follow_Up_Scheduled"
] as const;

// Helper function to handle date values
const dateSchema = z.preprocess((arg) => {
  if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
  return arg;
}, z.date().optional().nullable());

// Base schema for lead validation
export const leadSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  title: z.string().optional().nullable(),
  bdr: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  source: z.enum(leadSourceEnum),
  status: z.enum(leadStatusEnum),
  link: z.string().url("Must be a valid URL").optional().nullable(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  email: z.string().email("Invalid email address").optional().nullable(),
  lastUpdated: dateSchema,
});

// Schema for creating a new lead
export const createLeadSchema = leadSchema;

// Schema for updating an existing lead - includes id
export const updateLeadSchema = leadSchema.extend({
  id: z.number(),
});

// For filtering and searching
export const leadFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(leadStatusEnum).optional(),
  source: z.enum(leadSourceEnum).optional(),
  bdr: z.string().optional(),
  page: z.number().default(1),
  pageSize: z.number().default(10),
});

// Enhanced pipeline categories that reflect actual sales process
export const pipelineCategoryEnum = [
  "Calls",                    // Call scheduling and execution
  "Pipeline",                 // Proposals and agreements
  "Lists_Media_QA",          // Partner lists, media sales, Q&A
  "Declined_Rescheduled",    // Declined or rescheduled opportunities
  "Partner_Contacts"         // Individual partner contacts within sublists
] as const;

// Enhanced status mapping for each category
export const pipelineStatusEnum = {
  Calls: [
    "Call Proposed",
    "Call Booked", 
    "Call Conducted"
  ],
  Pipeline: [
    "Proposal - Media",
    "Proposal - Profile",
    "Agreement - Media", 
    "Agreement - Profile",
    "Partner List Pending"
  ],
  Lists_Media_QA: [
    "Partner List Sent",
    "List Out",
    "List Out - Not Sold",
    "Media Sales",
    "Q&A",
    "Free Q&A Offered", 
    "Sold"
  ],
  Declined_Rescheduled: [
    "Declined_Rescheduled",
    "Rescheduled",
    "Lost"
  ],
  Partner_Contacts: [
    "Contacted",
    "Interested", 
    "Declined",
    "Sold",
    "Follow-up Required",
    "Not Responsive"
  ]
} as const;

// Flatten the status arrays and remove duplicates to ensure each status appears only once.
export const allPipelineStatusValues = Array.from(
  new Set(Object.values(pipelineStatusEnum).flat())
);

// Helper function for URL validation
const urlSchema = z.union([
  z.string().url("Must be a valid URL"),
  z.string().max(0), // Empty string
  z.literal('')      // Empty string literal
]).optional().nullable().transform(v => v === '' ? null : v);

// Helper function for email validation
const emailSchema = z.union([
  z.string().email("Invalid email address"),
  z.string().max(0), // Empty string
  z.literal('')      // Empty string literal
]).optional().nullable().transform(v => v === '' ? null : v);

// Enhanced schema for pipeline item validation
export const pipelineItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  title: z.string().optional().nullable(),
  bdr: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  category: z.enum(pipelineCategoryEnum),
  status: z.string().refine(value => allPipelineStatusValues.includes(value as typeof allPipelineStatusValues[number]), {
    message: "Invalid status for pipeline item",
  }),
  value: z.number().optional().nullable(),
  probability: z.number().min(0).max(100).optional().nullable(),
  expectedCloseDate: dateSchema,
  callDate: dateSchema,
  lastUpdated: dateSchema,
  link: urlSchema,
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  email: emailSchema,
  leadId: z.number().optional().nullable(),
  // Enhanced sublist functionality fields
  parentId: z.number().optional().nullable(),
  isSublist: z.boolean().optional().nullable(),
  sublistName: z.string().optional().nullable(),
  sortOrder: z.number().optional().nullable(),
  // New fields for enhanced tracking
  partnerListSize: z.number().optional().nullable(),  // Track number of partners in list
  partnerListSentDate: dateSchema,                     // When partner list was sent
  firstSaleDate: dateSchema,                           // When first sale occurred
  totalSalesFromList: z.number().optional().nullable(), // Total sales from this partner list
});

// Schema for creating a new pipeline item
export const createPipelineItemSchema = pipelineItemSchema;

// Schema for updating an existing pipeline item - includes id
export const updatePipelineItemSchema = pipelineItemSchema.extend({
  id: z.number(),
});

// Pipeline schema for forms (simplified version)
export const pipelineSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  company: z.string().optional().nullable(),
  bdr: z.string().optional().nullable(),
  category: z.enum(pipelineCategoryEnum),
  status: z.string(),
  value: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  link: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  callDate: dateSchema,
});

// Enhanced filtering for pipeline items
export const pipelineFilterSchema = z.object({
  search: z.string().optional(),
  category: z.enum(pipelineCategoryEnum).optional(),
  status: z.string().optional(),
  bdr: z.string().optional(),
  dateFrom: dateSchema,
  dateTo: dateSchema,
  hasUpcomingCalls: z.boolean().optional(),
  hasPartnerLists: z.boolean().optional(),
  isSold: z.boolean().optional(),
  page: z.number().default(1),
  pageSize: z.number().default(50),
});

// Enhanced schema for activity logs
export const activityLogSchema = z.object({
  bdr: z.string(),
  activityType: z.enum(activityTypeEnum),
  description: z.string(),
  scheduledDate: dateSchema,
  completedDate: dateSchema,
  notes: z.string().optional().nullable(),
  leadId: z.number().optional().nullable(),
  pipelineItemId: z.number().optional().nullable(),
  previousStatus: z.string().optional().nullable(),
  newStatus: z.string().optional().nullable(),
  previousCategory: z.string().optional().nullable(),
  newCategory: z.string().optional().nullable(),
});

// Schema for creating a new activity log
export const createActivityLogSchema = activityLogSchema;

// Enhanced filtering for activity logs
export const activityLogFilterSchema = z.object({
  bdr: z.enum(leadBdrEnum).optional(),
  activityType: z.enum(activityTypeEnum).optional(),
  fromDate: dateSchema,
  toDate: dateSchema,
  leadId: z.number().optional(),
  pipelineItemId: z.number().optional(),
  page: z.number().default(1),
  pageSize: z.number().default(20),
});

// Schema for creating a sublist (enhanced)
export const createSublistSchema = z.object({
  name: z.string().min(1, "Sublist name is required").max(100),
  category: z.enum(pipelineCategoryEnum),
  status: z.string().refine(value => allPipelineStatusValues.includes(value as typeof allPipelineStatusValues[number]), {
    message: "Invalid status for sublist",
  }),
  bdr: z.enum(leadBdrEnum),
  parentId: z.number().optional().nullable(), // For nested sublists
  sortOrder: z.number().optional().nullable(),
  partnerListSize: z.number().optional().nullable(),
  expectedSales: z.number().optional().nullable(),
});

// Schema for moving item to sublist
export const moveToSublistSchema = z.object({
  itemId: z.number(),
  sublistId: z.number().optional().nullable(), // null to move out of sublist
  sortOrder: z.number().optional().nullable(),
});

// New schemas for enhanced reporting
export const reportingFilterSchema = z.object({
  bdr: z.enum(leadBdrEnum).optional(),
  dateFrom: dateSchema,
  dateTo: dateSchema,
  includeFuture: z.boolean().optional(),
  metric: z.enum(['calls', 'proposals', 'agreements', 'lists', 'sales']).optional(),
});

export const callVolumeReportSchema = z.object({
  bdr: z.enum(leadBdrEnum).optional(),
  period: z.enum(['week', 'month', 'quarter']),
  includeProjections: z.boolean().optional(),
});

export const agreementTrackingSchema = z.object({
  showPendingLists: z.boolean().optional(),
  showOverdueLists: z.boolean().optional(),
  bdr: z.enum(leadBdrEnum).optional(),
  dateRange: z.enum(['week', 'month', 'quarter', 'custom']),
});

export const partnerListAnalyticsSchema = z.object({
  minListSize: z.number().optional(),
  maxListSize: z.number().optional(),
  bdr: z.enum(leadBdrEnum).optional(),
  includeConversionRates: z.boolean().optional(),
  groupBySize: z.boolean().optional(),
});

// Finance Board status options
export const financeStatusEnum = [
  "Awaiting Invoice",
  "Cancelled", 
  "Paid",
  "Invoiced",
  "Late",
  "Pending Clearance",
  "On Hold",
  "Sales Contacting",
  "Net Date",
  "Partial Payment"
] as const;

// Schema for finance entry validation
export const financeEntrySchema = z.object({
  company: z.string().min(1, "Company is required"),
  bdr: z.enum(leadBdrEnum),
  leadGen: z.boolean().default(false),
  status: z.enum(financeStatusEnum),
  invoiceDate: dateSchema,
  dueDate: dateSchema,
  soldAmount: z.number().optional().nullable(),
  gbpAmount: z.number().optional().nullable(),
  exchangeRate: z.number().optional().nullable(),
  exchangeRateDate: dateSchema,
  actualGbpReceived: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  commissionPaid: z.boolean().default(false),
  danCommissionPaid: z.boolean().default(false),
  bdrCommissionAmount: z.number().optional().nullable(),
  danCommissionAmount: z.number().optional().nullable(),
  isMarkCawstonLead: z.boolean().default(false),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format").default("2025-01")
});

// Schema for creating a new finance entry
export const createFinanceEntrySchema = financeEntrySchema;

// Schema for updating an existing finance entry
export const updateFinanceEntrySchema = financeEntrySchema.partial().extend({
  id: z.number().optional(),
});

// Schema for filtering finance entries
export const financeFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(financeStatusEnum).optional(),
  bdr: z.enum(leadBdrEnum).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format").optional(),
  commissionPaid: z.boolean().optional(),
  dateFrom: dateSchema,
  dateTo: dateSchema,
  page: z.number().default(1),
  pageSize: z.number().default(10),
}); 