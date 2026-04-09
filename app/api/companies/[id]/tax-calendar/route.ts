import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const company = await sql`
    SELECT id FROM companies WHERE id = ${id} AND owner_user_id = ${user.id}
  `;

  if (company.rows.length === 0) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let result;
  if (status) {
    result = await sql`
      SELECT * FROM tax_obligations
      WHERE company_id = ${id} AND status = ${status}
      ORDER BY due_date ASC
    `;
  } else {
    result = await sql`
      SELECT * FROM tax_obligations
      WHERE company_id = ${id}
      ORDER BY due_date ASC
    `;
  }

  return NextResponse.json({ obligations: result.rows });
}
