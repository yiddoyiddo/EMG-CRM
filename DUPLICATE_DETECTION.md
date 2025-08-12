# Duplicate Detection & Partner Management System

This document outlines the comprehensive duplicate detection and partner management system implemented in the EMG CRM application.

## Overview

The duplicate detection system provides real-time checking for potential duplicates when BDRs add new leads or contacts to their pipeline. It includes warning dialogs, permission-based access control, audit trails, and administrative reporting.

## Key Features

### 1. Real-time Duplicate Detection
- Automatic checking when creating new leads or pipeline items
- Fuzzy matching algorithms for company names, contacts, emails, and phone numbers
- Debounced input checking to avoid excessive API calls
- Non-blocking workflow - BDRs can always proceed after acknowledgment

### 2. Smart Matching Algorithms
- **Company Name Matching**: Normalized company names with common suffix removal (Ltd, Inc, Corp, etc.)
- **Contact Email Matching**: Exact email matches and domain-level company detection
- **Phone Number Matching**: Normalized phone number comparison (digits only)
- **Name Similarity**: Levenshtein distance algorithm for name matching
- **LinkedIn Profile Matching**: URL-based profile duplicate detection
- **Confidence Scoring**: 0-100% confidence scores for all matches

### 3. Permission-Based Access Control
- **Admin**: Full access to all duplicate records, analytics, and management
- **Director**: View all duplicates but limited management capabilities  
- **Manager**: Territory-based duplicate visibility
- **Team Lead**: Team-level duplicate insights
- **BDR**: Basic duplicate warnings and own decision logging

### 4. Warning System & User Experience
- **Severity Levels**: Critical, High, Medium, Low based on confidence and recency
- **Non-Intrusive Warnings**: Clear dialog with "Proceed Anyway" option
- **Contextual Information**: Shows last contact date, owner, and match confidence
- **Reason Logging**: Optional/required reason entry for audit trail

### 5. Audit Trail & Analytics
- Complete logging of all duplicate warnings shown
- User decision tracking (proceeded, cancelled, ignored)
- IP address and user agent logging
- Admin dashboard with statistics and trends
- Export capabilities for compliance and analysis

## Database Schema

### Core Models

```prisma
model DuplicateWarning {
  id                String              @id @default(cuid())
  triggeredByUserId String
  triggerAction     DuplicateAction     // LEAD_CREATE, PIPELINE_CREATE, etc.
  warningType       DuplicateType       // COMPANY_NAME, CONTACT_EMAIL, etc.
  severity          WarningSeverity     // CRITICAL, HIGH, MEDIUM, LOW
  triggerData       Json                // Original form data
  potentialDuplicates DuplicateMatch[]  // Found matches
  userDecision      UserDecision?       // PROCEEDED, CANCELLED, IGNORED
  decisionMade      Boolean @default(false)
  decisionAt        DateTime?
  proceedReason     String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model DuplicateMatch {
  id                  String @id @default(cuid())
  warningId           String
  matchType           DuplicateType
  confidence          Float              // 0.0 to 1.0
  matchDetails        Json               // Match specifics
  existingLeadId      Int?
  existingPipelineId  Int?
  ownedByUserId       String?
  lastContactDate     DateTime?
  recordStatus        String?
}

model CompanyRegistry {
  id                String @id @default(cuid())
  companyName       String
  normalizedName    String            // For matching
  domain            String?
  aliases           String[]          // Alternative spellings
  primaryEmail      String?
  primaryPhone      String?
  totalContacts     Int @default(0)
  activeDeals       Int @default(0)
  lastContactedAt   DateTime?
}

model ContactRegistry {
  id              String @id @default(cuid())
  fullName        String
  normalizedName  String
  email           String?
  normalizedEmail String?
  phone           String?
  normalizedPhone String?
  title           String?
  linkedinUrl     String?
  companyId       String?
  lastContactedAt DateTime?
  contactCount    Int @default(0)
}

model DuplicateAuditLog {
  id              String @id @default(cuid())
  userId          String
  action          String    // 'warning_shown', 'proceeded_anyway', 'cancelled'
  warningId       String?
  entityType      String    // 'lead', 'pipeline', 'company', 'contact'
  entityId        String?
  decisionReason  String?
  systemSuggestion String?
  actualOutcome   String?   // Follow-up validation
  ipAddress       String?
  userAgent       String?
  timestamp       DateTime @default(now())
}
```

## API Endpoints

### `/api/duplicates/check` (POST)
Check for potential duplicates when creating/updating records.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "company": "Acme Corp",
  "phone": "+44 7700 900123",
  "linkedinUrl": "https://linkedin.com/in/johndoe",
  "title": "CEO",
  "action": "LEAD_CREATE"
}
```

**Response:**
```json
{
  "hasWarning": true,
  "severity": "HIGH",
  "warningId": "clh5k9j0a0000qh8x2v2nq7r0",
  "message": "Potential duplicate detected: Similar contact email was contacted 2 months ago by Jane Smith",
  "matches": [
    {
      "id": "lead-email-123",
      "matchType": "CONTACT_EMAIL",
      "confidence": 1.0,
      "severity": "HIGH",
      "matchDetails": {
        "type": "exact",
        "field": "contact email"
      },
      "existingRecord": {
        "type": "lead",
        "company": "Acme Corp",
        "lastContactDate": "2024-06-15T10:30:00Z",
        "status": "In Progress",
        "isActive": true,
        "owner": {
          "name": "Jane Smith"
        }
      }
    }
  ]
}
```

### `/api/duplicates/decision` (POST)
Record user decision on duplicate warning.

**Request:**
```json
{
  "warningId": "clh5k9j0a0000qh8x2v2nq7r0",
  "decision": "PROCEEDED",
  "reason": "Verified this is a different contact at the same company"
}
```

### `/api/duplicates/search` (GET)
Search existing database for potential duplicates.

**Query Parameters:**
- `query`: Search term (required, min 2 chars)
- `type`: Search type (all, company, contact, email, phone)
- `limit`: Max results (1-100, default 20)
- `includeInactive`: Include closed/inactive records

### `/api/admin/duplicates` (GET)
Admin endpoint for statistics and management.

**Query Parameters:**
- `action`: statistics, recent-warnings
- `dateFrom`: Start date for statistics
- `dateTo`: End date for statistics
- `limit`: Max warnings to return
- `includeResolved`: Include resolved warnings

## Components

### `DuplicateWarningDialog`
Main warning dialog component with:
- Severity-based styling and icons
- Match details with confidence scores
- Owner and last contact information
- Acknowledgment checkbox
- Optional/required reason field
- Proceed/Cancel actions

### `DuplicateSearch`
Advanced search component for finding existing records:
- Real-time search with debouncing
- Multiple search types (company, contact, email, phone)
- Relevance scoring and result ranking
- Include/exclude inactive records
- Detailed result cards with match confidence

### Admin Dashboard (`/admin/duplicates`)
Comprehensive management interface:
- Statistics cards (total warnings, proceed rate, etc.)
- Severity breakdown charts
- Recent warnings table with filters
- User behavior analysis
- Export capabilities

## Integration with Lead Forms

The duplicate detection is seamlessly integrated into the existing lead creation workflow:

1. **Real-time Checking**: As users type in the form fields, the system debounces input and checks for potential duplicates
2. **Visual Indicators**: Loading states and warning badges appear when duplicates are detected
3. **Non-blocking Workflow**: Users can always proceed after seeing warnings
4. **Form State Management**: The form preserves all data when duplicate dialogs are shown
5. **Submit Flow**: Final duplicate check occurs before actual submission

## Configuration

### Matching Thresholds
```typescript
// In duplicate-detection.ts
const COMPANY_SIMILARITY_THRESHOLD = 0.8;   // 80% similarity for company names
const NAME_SIMILARITY_THRESHOLD = 0.85;     // 85% similarity for person names
const PHONE_MIN_LENGTH = 7;                 // Minimum phone number length
const DEBOUNCE_MS = 500;                    // Form input debounce time
```

### Severity Calculation
```typescript
function calculateMatchSeverity(confidence: number, lastContactDate?: Date): WarningSeverity {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 3 * 30 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
  
  // High confidence exact matches
  if (confidence >= 0.95) {
    if (lastContactDate && lastContactDate > threeMonthsAgo) {
      return WarningSeverity.CRITICAL; // Recent contact with exact match
    }
    if (lastContactDate && lastContactDate > sixMonthsAgo) {
      return WarningSeverity.HIGH;
    }
    return WarningSeverity.MEDIUM;
  }
  
  // Good confidence matches
  if (confidence >= 0.8) {
    if (lastContactDate && lastContactDate > threeMonthsAgo) {
      return WarningSeverity.HIGH;
    }
    return WarningSeverity.MEDIUM;
  }
  
  return WarningSeverity.LOW;
}
```

## Security & Privacy

### Data Protection
- **Minimal Data Exposure**: BDRs only see basic duplicate info, not full record details
- **Permission-Based Filtering**: Data access based on user roles and territories
- **Audit Logging**: Complete audit trail for compliance
- **GDPR Compliance**: Personal data handling follows privacy regulations

### Performance
- **Database Indexing**: Optimized indexes on search fields
- **Query Optimization**: Efficient queries with appropriate limits
- **Caching**: Service-level caching for frequently accessed data
- **Debouncing**: Prevents excessive API calls from form inputs

## Testing

### Unit Tests
- Normalization functions
- Similarity algorithms
- Service methods
- Permission checks

### Integration Tests
- API endpoints
- Database operations
- Permission enforcement
- Error handling

### Example Test
```typescript
describe('Duplicate Detection', () => {
  it('should detect exact email matches', async () => {
    const result = await duplicateDetectionService.checkForDuplicates(
      { email: 'test@example.com' },
      'user123',
      DuplicateAction.LEAD_CREATE
    );
    
    expect(result.hasWarning).toBe(true);
    expect(result.matches[0].confidence).toBe(1.0);
  });
});
```

## Monitoring & Analytics

### Key Metrics
- Total duplicate warnings shown
- Proceed vs. cancel rates by user/team
- Most common duplicate types
- False positive rates
- System response times

### Admin Dashboard Insights
- User behavior patterns
- Duplicate trends over time
- Territory-based analysis
- System effectiveness metrics

## Future Enhancements

1. **Machine Learning**: Improve matching algorithms with ML models
2. **Bulk Import Checking**: Validate entire CSV uploads for duplicates
3. **Integration APIs**: Connect with external data sources (LinkedIn, Companies House)
4. **Advanced Analytics**: Predictive duplicate detection
5. **Mobile Optimization**: Native mobile app integration
6. **Workflow Automation**: Automatic duplicate merging suggestions

## Troubleshooting

### Common Issues
1. **Slow Performance**: Check database indexes and query optimization
2. **False Positives**: Adjust similarity thresholds in configuration
3. **Permission Errors**: Verify user roles and territory assignments
4. **API Timeouts**: Increase timeout limits for large datasets

### Debug Mode
Enable detailed logging by setting environment variable:
```bash
DUPLICATE_DEBUG=true
```

## Support

For technical support or feature requests related to the duplicate detection system:
- Create an issue in the project repository
- Contact the development team through internal channels
- Review the audit logs for detailed error information

---

*This system ensures data quality while maintaining BDR productivity, providing comprehensive duplicate prevention without blocking business operations.*