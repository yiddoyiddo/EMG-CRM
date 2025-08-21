import { NextRequest, NextResponse } from 'next/server';

interface EmailFindResult {
  email: string;
  user: string;
  domain: string;
  mx: string;
  code: 'ok' | 'ko' | 'mb';
  message: string;
  status: 'Valid' | 'Invalid' | 'Unverifiable';
}

interface EmailFindResponse {
  success: boolean;
  results: EmailFindResult[];
  validEmails: EmailFindResult[];
  totalTested: number;
  validCount: number;
  invalidCount: number;
  unverifiableCount: number;
  firstName: string;
  lastName: string;
  domain: string;
  error?: string;
}

function generateEmailPatterns(firstName: string, lastName: string, domain: string): string[] {
  const first = firstName.toLowerCase().trim();
  const last = lastName.toLowerCase().trim();
  const firstInitial = first.charAt(0);
  const lastInitial = last.charAt(0);
  
  // Generate business-appropriate email patterns only
  const patterns = [
    // Full name combinations
    `${first}${last}@${domain}`,                    // johnsmith
    `${last}${first}@${domain}`,                    // smithjohn
    `${first}_${last}@${domain}`,                   // john_smith
    `${last}_${first}@${domain}`,                   // smith_john
    `${first}.${last}@${domain}`,                   // john.smith
    `${last}.${first}@${domain}`,                   // smith.john
    `${first}-${last}@${domain}`,                   // john-smith
    `${last}-${first}@${domain}`,                   // smith-john
    
    // First name + last initial variations
    `${first}${lastInitial}@${domain}`,             // johns
    `${first}_${lastInitial}@${domain}`,            // john_s
    `${first}.${lastInitial}@${domain}`,            // john.s
    `${first}-${lastInitial}@${domain}`,            // john-s
    
    // First initial + last name variations
    `${firstInitial}${last}@${domain}`,             // jsmith
    `${firstInitial}_${last}@${domain}`,            // j_smith
    `${firstInitial}.${last}@${domain}`,            // j.smith
    `${firstInitial}-${last}@${domain}`,            // j-smith
    
    // Last name + first initial variations
    `${last}${firstInitial}@${domain}`,             // smithj
    `${last}_${firstInitial}@${domain}`,            // smith_j
    `${last}.${firstInitial}@${domain}`,            // smith.j
    `${last}-${firstInitial}@${domain}`,            // smith-j
    
    // Initial combinations
    `${firstInitial}${lastInitial}@${domain}`,      // js
    `${firstInitial}.${lastInitial}@${domain}`,     // j.s
    `${firstInitial}_${lastInitial}@${domain}`,     // j_s
    `${firstInitial}-${lastInitial}@${domain}`,     // j-s
    `${lastInitial}${firstInitial}@${domain}`,      // sj
    `${lastInitial}.${firstInitial}@${domain}`,     // s.j
    `${lastInitial}_${firstInitial}@${domain}`,     // s_j
    `${lastInitial}-${firstInitial}@${domain}`,     // s-j
    
    // Single names
    `${first}@${domain}`,                           // john
    `${last}@${domain}`,                            // smith
  ];
  
  // Remove duplicates, empty strings, and invalid patterns
  return [...new Set(patterns)].filter(email => 
    email.length > 0 && 
    !email.includes('undefined') && 
    !email.includes('null') &&
    !email.startsWith('@') &&
    email.includes('@')
  );
}

async function verifyEmailBatch(emails: string[], token: string): Promise<EmailFindResult[]> {
  const results: EmailFindResult[] = [];
  const BATCH_SIZE = 170; // Ultimate Plan: 170 emails every 30 seconds
  const BATCH_DELAY = 30000; // 30 seconds between batches
  const EMAIL_DELAY = 170; // 170ms between individual emails within a batch
  
  console.log(`Starting verification for ${emails.length} emails`);
  
  // Process emails in batches
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);
    const batchStartTime = Date.now();
    
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} with ${batch.length} emails`);
    
    // Process each email in the batch with proper spacing
    for (let j = 0; j < batch.length; j++) {
      const email = batch[j];
      
      try {
        console.log(`Verifying email ${j + 1}/${batch.length}: ${email}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(
          `https://happy.mailtester.ninja/ninja?email=${encodeURIComponent(email)}&token=${token}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal
          }
        );
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          console.log(`Email ${email} failed with status: ${response.status}`);
          results.push({
            email,
            code: 'ko',
            message: `HTTP ${response.status}: ${response.statusText}`,
            user: '',
            domain: '',
            mx: '',
            status: 'Invalid'
          });
        } else {
          const data = await response.json();
          console.log(`Email ${email} result:`, data.code);
          const status = data.code === 'ok' ? 'Valid' : data.code === 'mb' ? 'Unverifiable' : 'Invalid';
          
          results.push({
            email: data.email,
            user: data.user,
            domain: data.domain,
            mx: data.mx,
            code: data.code,
            message: data.message,
            status
          });
        }
      } catch (error) {
        console.error(`Error verifying email ${email}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          email,
          code: 'ko',
          message: `Network error: ${errorMessage}`,
          user: '',
          domain: '',
          mx: '',
          status: 'Invalid'
        });
      }
      
      // Wait 170ms before next email (except for last email in batch)
      if (j < batch.length - 1) {
        await new Promise(resolve => setTimeout(resolve, EMAIL_DELAY));
      }
    }
    
    console.log(`Completed batch ${Math.floor(i / BATCH_SIZE) + 1}, processed ${results.length} emails so far`);
    
    // If there are more batches to process, wait for the full 30-second window
    if (i + BATCH_SIZE < emails.length) {
      const batchDuration = Date.now() - batchStartTime;
      const remainingTime = BATCH_DELAY - batchDuration;
      
      if (remainingTime > 0) {
        console.log(`Waiting ${remainingTime}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
    }
  }
  
  console.log(`Completed verification for all ${emails.length} emails, returning ${results.length} results`);
  return results;
}

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, domain, token } = await request.json();

    if (!firstName || !lastName || !domain) {
      return NextResponse.json(
        { success: false, error: 'Please provide first name, last name, and domain' },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication token is required' },
        { status: 400 }
      );
    }

    // Generate email patterns to test
    const emailPatterns = generateEmailPatterns(firstName, lastName, domain);
    
    // Process emails using batch verification with Ultimate Plan rate limits
    const results = await verifyEmailBatch(emailPatterns, token);
    const validEmails = results.filter(r => r.code === 'ok');

    const validCount = results.filter(r => r.code === 'ok').length;
    const invalidCount = results.filter(r => r.code === 'ko').length;
    const unverifiableCount = results.filter(r => r.code === 'mb').length;

    const response: EmailFindResponse = {
      success: true,
      results,
      validEmails,
      totalTested: emailPatterns.length,
      validCount,
      invalidCount,
      unverifiableCount,
      firstName,
      lastName,
      domain,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in email finding:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to find emails' 
      },
      { status: 500 }
    );
  }
}