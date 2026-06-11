import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.HOTSPOT_API_URL ?? 'http://localhost:8080'

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const jar = await cookies()
  const token = jar.get('hotspot_token')?.value

  const { path } = await params
  const search = req.nextUrl.search
  const targetUrl = `${API_BASE}/api/v1/${path.join('/')}${search}`

  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const contentType = req.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)

  const body =
    req.method !== 'GET' && req.method !== 'HEAD'
      ? await req.arrayBuffer()
      : undefined

  const upstream = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: body ? Buffer.from(body) : undefined,
  })

  const responseBody = await upstream.arrayBuffer()
  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
    },
  })
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
