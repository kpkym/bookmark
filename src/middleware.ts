// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const apiKey = process.env.API_KEY
  if (!apiKey) return NextResponse.next()

  const header = req.headers.get('x-api-key')
  if (header !== apiKey) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
