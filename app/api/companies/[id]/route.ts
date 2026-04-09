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

  const result = await sql`
    SELECT * FROM companies WHERE id = ${id} AND owner_user_id = ${user.id}
  `;

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  return NextResponse.json({ company: result.rows[0] });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const existing = await sql`
    SELECT id FROM companies WHERE id = ${id} AND owner_user_id = ${user.id}
  `;
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  try {
    const { name, bin, tax_regime, registration_date, vat_payer, notes } =
      await request.json();

    const result = await sql`
      UPDATE companies SET
        name = COALESCE(${name || null}, name),
        bin = COALESCE(${bin || null}, bin),
        tax_regime = COALESCE(${tax_regime || null}, tax_regime),
        registration_date = COALESCE(${registration_date || null}, registration_date),
        vat_payer = COALESCE(${vat_payer !== undefined ? vat_payer : null}, vat_payer),
        notes = COALESCE(${notes !== undefined ? notes : null}, notes)
      WHERE id = ${id} AND owner_user_id = ${user.id}
      RETURNING *
    `;

    return NextResponse.json({ company: result.rows[0] });
  } catch (error) {
    console.error('Update company error:', error);
    return NextResponse.json(
      { error: 'Failed to update company' },
      { status: 500 }
    );
  }
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
    DELETE FROM companies WHERE id = ${id} AND owner_user_id = ${user.id} RETURNING id
  `;

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
