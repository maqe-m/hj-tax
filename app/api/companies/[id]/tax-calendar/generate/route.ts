import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/auth/session';
import { generateObligations } from '@/lib/tax-calendar/generator';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership and get company
  const companyResult = await sql`
    SELECT id, tax_regime FROM companies WHERE id = ${id} AND owner_user_id = ${user.id}
  `;

  if (companyResult.rows.length === 0) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  const company = companyResult.rows[0];
  const fromDate = new Date();
  const toDate = new Date();
  toDate.setMonth(toDate.getMonth() + 12);

  const obligations = generateObligations(
    { id: company.id, tax_regime: company.tax_regime },
    fromDate,
    toDate
  );

  // Insert obligations (skip duplicates by checking existing)
  let inserted = 0;
  for (const obl of obligations) {
    const existing = await sql`
      SELECT id FROM tax_obligations
      WHERE company_id = ${obl.company_id}
        AND tax_type = ${obl.tax_type}
        AND period_start = ${obl.period_start}
        AND period_end = ${obl.period_end}
    `;

    if (existing.rows.length === 0) {
      await sql`
        INSERT INTO tax_obligations (company_id, tax_type, period_start, period_end, due_date, status, notes)
        VALUES (${obl.company_id}, ${obl.tax_type}, ${obl.period_start}, ${obl.period_end}, ${obl.due_date}, ${obl.status}, ${obl.notes})
      `;
      inserted++;
    }
  }

  return NextResponse.json({
    message: `Generated ${inserted} new obligations`,
    total: obligations.length,
    inserted,
  });
}
