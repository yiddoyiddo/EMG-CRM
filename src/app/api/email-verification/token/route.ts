import { NextRequest, NextResponse } from 'next/server';

const MAILTESTER_KEY = 'sub_1RqwpEAJu6gy4fiY6HjlCsFr';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`https://token.mailtester.ninja/token?key=${MAILTESTER_KEY}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get token: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      token: data.token,
      message: data.message,
    });
  } catch (error) {
    console.error('Error getting MailTester token:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get authentication token' 
      },
      { status: 500 }
    );
  }
}