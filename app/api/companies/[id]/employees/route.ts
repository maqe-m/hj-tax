import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/auth/session';

async function verifyCompanyOwnership(companyId: string, userId: number) {
  const result = await sql`
    SELECT id FROM companies WHERE id = ${companyId} AND owner_user_id = ${userId}
  `;
  return result.rows.length > 0;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  if (!(await verifyCompanyOwnership(id, user.id))) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  const result = await sql`
    SELECT * FROM employees WHERE company_id = ${id} ORDER BY created_at DESC
  `;

  return NextResponse.json({ employees: result.rows });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  if (!(await verifyCompanyOwnership(id, user.id))) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { full_name, iin, position, salary_gross, hire_date, is_resident, is_pensioner, has_disability } = body;

    if (!full_name || !iin) {
      return NextResponse.json(
        { error: 'Full name and IIN are required' },
        { status: 400 }
      );
    }

    if (iin.length !== 12) {
      return NextResponse.json(
        { error: 'IIN must be exactly 12 characters' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO employees (company_id, full_name, iin, position, salary_gross, hire_date, is_resident, is_pensioner, has_disability)
      VALUES (${id}, ${full_name}, ${iin}, ${position || null}, ${salary_gross || null}, ${hire_date || null}, ${is_resident ?? true}, ${is_pensioner ?? false}, ${has_disability ?? false})
      RETURNING *
    `;

    return NextResponse.json({ employee: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Create employee error:', error);
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}
