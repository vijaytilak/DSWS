import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apiUrl = `${process.env.API_URL}/${process.env.BUBBLES_API}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching bubbles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bubbles data' },
      { status: 500 }
    );
  }
}

// Keep GET method for testing
export async function GET() {
  try {
    const apiUrl = `${process.env.API_URL}/${process.env.BUBBLES_API}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching bubbles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bubbles data' },
      { status: 500 }
    );
  }
}
