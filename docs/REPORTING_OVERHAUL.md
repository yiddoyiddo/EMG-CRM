# EMG-CRM Reporting Overhaul – Specification

## 1. Context & Objectives

This document distils our deep-dive analysis of the EMG sales workflow and sets the blueprint for a next-generation reporting suite that aligns perfectly with how the team operates.

Goals:
1. Provide real-time visibility into the **health of the pipeline** (calls, agreements, partner lists).
2. Surface **actionable insights** & early warnings (e.g. low call volume, overdue partner lists).
3. Enable leadership to **track performance** at team & individual BDR level, with historical trends and forecasts.
4. Keep the solution **maintainable, extensible, and performant**.

## 2. Key Stages & Entities

| Stage | Alias | Description |
|-------|-------|-------------|
| Lead | N/A | Raw contact generated via prospecting or Lead Gen team |
| Call Booked | `CALL_BOOKED` | Discovery call scheduled |
| Call Conducted | `CALL_CONDUCTED` | Discovery call completed |
| Proposal (Soft-Yes) | `PROPOSAL_*` | Lead interested – awaiting decision |
| Agreement (Hard-Yes) | `AGREEMENT_*` | Lead confirmed & partner-list date agreed |
| Partner List Sent | `PARTNER_LIST_SENT` | Email broadcast sent to lead’s partner list |
| List Out Outcomes | `SOLD`, `LIST_OUT_NOT_SOLD`, `FREE_QA_OFFERED` |

Supplementary entity **Sublist** – container holding the individual partner contacts spawned from a list-out.

## 3. Critical Metrics & KPIs

1. **Steady Call Volume** – Calls completed per BDR per week vs target.
2. **Agreement Count** – Hard-yes agreements per month vs target.
3. **Lists-Out** – Partner lists sent per month vs target.
4. **Conversion Rates**
   • Call ➜ Proposal  • Proposal ➜ Agreement  • List-Out ➜ First Sale.
5. **Pipeline Health** – forward-looking scheduled calls, outstanding proposals, overdue partner lists.
6. **Revenue Efficiency** – Revenue/Call, Revenue/List, Revenue/BDR (fed by external sales data when available).
7. **BDR Performance Index** – Composite score (calls ×1 + agreements ×3 + lists ×2 + sales ×5).
8. **Activity Heatmap** – Calls by BDR per day/time segment.

## 4. Data-Model Additions

| Model | Field | Type | Purpose |
|-------|-------|------|---------|
| `PipelineItem` | `agreementDate` | DateTime | Date hard-yes reached |
|  | `partnerListDueDate` | DateTime | Date agreed to send partner list |
|  | `partnerListSentDate` | DateTime | Date list email actually sent |
|  | `firstSaleDate` | DateTime | First sale from list |
|  | `partnerListSize` | Int | Number of partners emailed |
|  | `totalSalesFromList` | Int | Number of sales from that list |
| `ActivityLog` | `scheduledDate` & `completedDate` already exist – no change |
| `KpiTarget` | baseline already present – extend seed script for defaults |

## 5. API Extensions

New endpoints (all under `/api/reporting`):
- `call-volume` – weekly & daily aggregates with heatmap data.
- `agreements` – counts & trend lines.
- `lists-out` – counts, average list size, conversion rates.
- `alerts` – consolidated urgent/high/medium actions (used by Slack notifier).

Existing endpoints `analytics`, `agreement-tracking`, etc. will be refactored to reuse the new service layer.

## 6. Front-End Enhancements

- **Dashboard Landing** – high-level KPI cards + traffic-light statuses.
- **Trend Charts** – Line/area charts for calls, agreements, lists-out.
- **BDR Leaderboard** – sortable table with composite score & key metrics.
- **Heatmap** – Matrix of calls per hour/day.
- Global **Filters** – date range, BDR (multi-select), category.
- CSV/Excel export buttons on each view.

## 7. Alerting Logic

1. Calls this week < 25 ➜ `high` priority alert.
2. Partner lists past due ➜ `urgent` alert with count.
3. Upcoming calls next week < 30 ➜ `high` alert.
4. BDR needs support (score <10 and Calls <5) ➜ `medium`.

Alerts aggregated & POSTed to Slack webhook hourly.

## 8. Seed/Test Data Strategy

Leverage `scripts/create-comprehensive-sales-test-data.ts` with params:
- 150 main leads (90 days back, 30 days forward)
- Partner lists sized 3-20
- Realistic conversion probabilities (see script).

This yields ~150 leads ➜ ~1,500 pipeline items inc. sublists, ~3,000 activity logs – enough for meaningful charts without bloating the dev DB.

## 9. Performance & Scaling

- Indexes on `callDate`, `partnerListSentDate`, `agreementDate`.
- Batched aggregate queries using Prisma `groupBy`.
- In-memory cache (e.g. `lru-cache`) for expensive aggregates (5-min TTL).

## 10. Roll-Out Considerations

1. **Migration Order** –
   a. Add new nullable columns ➜ deploy 
   b. Backfill historical data ➜ update scripts  
   c. Switch services/UI to new metrics  
   d. Mark old fields deprecated
2. **User Training** – Release loom video & doc walk-through.
3. **Feature Flags** – Progressive rollout, dashboards behind flag until parity met.

---
*Generated: {{DATE}}* 