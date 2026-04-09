import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db/init';

export async function POST(request: Request) {
  // Basic protection: require JWT_SECRET to be configured
  if (!process.env.JWT_SECRET) {
    return NextResponse.json(
      { error: 'Server not configured. JWT_SECRET is missing.' },
      { status: 503 }
    );
  }

  // Check for admin secret in Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.JWT_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await initializeDatabase();
    return NextResponse.json({
      message: 'Database initialized successfully',
      ...result,
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database', details: String(error) },
      { status: 500 }
    );
  }
}
