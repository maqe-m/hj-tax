import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');

  let result;
  if (companyId) {
    result = await sql`
      SELECT cs.*, c.name as company_name
      FROM chat_sessions cs
      LEFT JOIN companies c ON cs.company_id = c.id
      WHERE cs.user_id = ${user.id} AND cs.company_id = ${companyId}
      ORDER BY cs.updated_at DESC
    `;
  } else {
    result = await sql`
      SELECT cs.*, c.name as company_name
      FROM chat_sessions cs
      LEFT JOIN companies c ON cs.company_id = c.id
      WHERE cs.user_id = ${user.id}
      ORDER BY cs.updated_at DESC
    `;
  }

  return NextResponse.json({ sessions: result.rows });
}
