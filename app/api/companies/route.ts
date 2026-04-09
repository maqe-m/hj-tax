import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await sql`
    SELECT * FROM companies WHERE owner_user_id = ${user.id} ORDER BY created_at DESC
  `;

  return NextResponse.json({ companies: result.rows });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, bin, tax_regime, registration_date, vat_payer, notes } =
      await request.json();

    if (!name || !bin || !tax_regime) {
      return NextResponse.json(
        { error: 'Name, BIN, and tax regime are required' },
        { status: 400 }
      );
    }

    if (bin.length !== 12) {
      return NextResponse.json(
        { error: 'BIN must be exactly 12 characters' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO companies (owner_user_id, name, bin, tax_regime, registration_date, vat_payer, notes)
      VALUES (${user.id}, ${name}, ${bin}, ${tax_regime}, ${registration_date || null}, ${vat_payer || false}, ${notes || null})
      RETURNING *
    `;

    return NextResponse.json({ company: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Create company error:', error);
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    );
  }
}
