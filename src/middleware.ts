import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

function safeCompare(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length)
  let result = a.length ^ b.length
  for (let i = 0; i < len; i++) {
    result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return result === 0
}

export function middleware(req: NextRequest) {
  const apiKey = process.env.API_KEY
  if (!apiKey)
    return NextResponse.next()

  const header = req.headers.get('x-api-key') ?? ''
  if (!safeCompare(header, apiKey)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
