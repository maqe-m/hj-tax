import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { hashPassword } from '@/lib/auth/password';
import { signToken } from '@/lib/auth/jwt';

export async function POST(request: Request) {
  try {
    const { email, password, full_name } = await request.json();

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    const password_hash = await hashPassword(password);

    const result = await sql`
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES (${email}, ${password_hash}, ${full_name}, 'owner')
      RETURNING id, email, full_name, role
    `;

    const user = result.rows[0];
    const token = await signToken({ userId: user.id, email: user.email });

    const response = NextResponse.json({ user });
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
