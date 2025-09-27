import { NextResponse } from 'next/server';

export async function GET() {
  const healthInfo = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    features: {
      openai: !!process.env.OPENAI_API_KEY,
      gemini: !!process.env.GOOGLE_API_KEY,
      coinapi: !!process.env.COINAPI_KEY,
    }
  };

  return NextResponse.json(healthInfo);
}

export const runtime = 'edge';