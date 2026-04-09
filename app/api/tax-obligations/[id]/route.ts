import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/auth/session';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Verify user owns the company that owns this obligation
  const obligation = await sql`
    SELECT to2.id FROM tax_obligations to2
    JOIN companies c ON to2.company_id = c.id
    WHERE to2.id = ${id} AND c.owner_user_id = ${user.id}
  `;

  if (obligation.rows.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { status, amount } = body;

    let result;
    if (status === 'paid') {
      result = await sql`
        UPDATE tax_obligations SET
          status = 'paid',
          amount = COALESCE(${amount !== undefined ? amount : null}, amount),
          paid_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    } else {
      result = await sql`
        UPDATE tax_obligations SET
          status = COALESCE(${status || null}, status),
          amount = COALESCE(${amount !== undefined ? amount : null}, amount)
        WHERE id = ${id}
        RETURNING *
      `;
    }

    return NextResponse.json({ obligation: result.rows[0] });
  } catch (error) {
    console.error('Update obligation error:', error);
    return NextResponse.json(
      { error: 'Failed to update obligation' },
      { status: 500 }
    );
  }
}
