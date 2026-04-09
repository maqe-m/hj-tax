import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Verify session belongs to user
  const session = await sql`
    SELECT cs.*, c.name as company_name
    FROM chat_sessions cs
    LEFT JOIN companies c ON cs.company_id = c.id
    WHERE cs.id = ${id} AND cs.user_id = ${user.id}
  `;

  if (session.rows.length === 0) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const messages = await sql`
    SELECT id, role, content, created_at FROM chat_messages
    WHERE session_id = ${id}
    ORDER BY created_at ASC
  `;

  return NextResponse.json({
    session: session.rows[0],
    messages: messages.rows,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const result = await sql`
    DELETE FROM chat_sessions WHERE id = ${id} AND user_id = ${user.id} RETURNING id
  `;

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
