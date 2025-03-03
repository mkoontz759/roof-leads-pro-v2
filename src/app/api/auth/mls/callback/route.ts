import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')

    console.log('Received callback with code:', code)
    console.log('State:', state)

    if (!code) {
      throw new Error('No authorization code received')
    }

    // Exchange code for token
    const tokenResponse = await fetch('https://retsidentityapi.raprets.com/lab_lbk/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: 'lab_lbk',
        client_secret: 'c611edc190444c2ab90abce0b8703b83',
        code,
        redirect_uri: 'http://localhost:3000/api/auth/mls/callback'
      }).toString()
    })

    const data = await tokenResponse.json()
    console.log('Token response:', data)

    // Store the token securely
    cookies().set('mls_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })

    return NextResponse.redirect(new URL('/dashboard', req.url))
  } catch (error) {
    console.error('MLS Callback Error:', error)
    return NextResponse.redirect(new URL('/error', req.url))
  }
} 