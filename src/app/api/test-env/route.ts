import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    hasDbUrl: !!process.env.DATABASE_URL,
    urlLength: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0,
    urlPrefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 15) : null
  });
}
