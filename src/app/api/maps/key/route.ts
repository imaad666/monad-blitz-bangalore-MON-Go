import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.GOOGLE_MAPS_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key not configured' },
      { status: 500 }
    );
  }

  // Return the API key (Note: This will still be visible in network requests,
  // but it's better than bundling it into the client code)
  return NextResponse.json({ apiKey });
}

