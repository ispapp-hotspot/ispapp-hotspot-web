import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const res = await fetch(`${process.env.HOTSPOT_API_URL ?? 'http://localhost:8080'}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json()

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status })
  }

  const jar = await cookies()
  jar.set('hotspot_token', data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: data.expiresIn ?? 86400,
    sameSite: 'lax',
  })

  return NextResponse.json({
    name:  data.name,
    email: data.email,
    role:  data.role,
  })
}
