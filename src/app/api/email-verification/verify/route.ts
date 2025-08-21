import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { emails, token } = await request.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please provide at least one email address' },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication token is required' },
        { status: 400 }
      );
    }

    const results = [];
    
    for (const email of emails) {
      if (!email || typeof email !== 'string') {
        results.push({
          email: email || 'invalid',
          code: 'ko',
          message: 'Invalid email format',
          user: '',
          domain: '',
          mx: ''
        });
        continue;
      }

      try {
        const response = await fetch(
          `https://happy.mailtester.ninja/ninja?email=${encodeURIComponent(email)}&token=${token}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          results.push({
            email,
            code: 'ko',
            message: 'Verification failed',
            user: '',
            domain: '',
            mx: ''
          });
          continue;
        }

        const data = await response.json();
        results.push(data);

        // Rate limiting: wait 870ms between requests to respect API limits
        if (emails.indexOf(email) < emails.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 870));
        }
      } catch (error) {
        console.error(`Error verifying email ${email}:`, error);
        results.push({
          email,
          code: 'ko',
          message: 'Network error',
          user: '',
          domain: '',
          mx: ''
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      total: emails.length,
      verified: results.filter(r => r.code === 'ok').length,
      invalid: results.filter(r => r.code === 'ko').length,
      unverifiable: results.filter(r => r.code === 'mb').length,
    });
  } catch (error) {
    console.error('Error in email verification:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to verify emails' 
      },
      { status: 500 }
    );
  }
}