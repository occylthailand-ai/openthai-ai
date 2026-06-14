import { NextResponse } from 'next/server'
export async function GET() {
  return NextResponse.json({ status: 'ok', platform: 'Openthai.ai v2.0', timestamp: new Date().toISOString() })
}
