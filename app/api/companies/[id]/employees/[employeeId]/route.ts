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
  { params }: { params: Promise<{ id: string; employeeId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, employeeId } = await params;

  if (!(await verifyCompanyOwnership(id, user.id))) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  const result = await sql`
    SELECT * FROM employees WHERE id = ${employeeId} AND company_id = ${id}
  `;

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  return NextResponse.json({ employee: result.rows[0] });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; employeeId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, employeeId } = await params;

  if (!(await verifyCompanyOwnership(id, user.id))) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { full_name, iin, position, salary_gross, hire_date, termination_date, is_resident, is_pensioner, has_disability } = body;

    const result = await sql`
      UPDATE employees SET
        full_name = COALESCE(${full_name || null}, full_name),
        iin = COALESCE(${iin || null}, iin),
        position = COALESCE(${position || null}, position),
        salary_gross = COALESCE(${salary_gross !== undefined ? salary_gross : null}, salary_gross),
        hire_date = COALESCE(${hire_date || null}, hire_date),
        termination_date = ${termination_date !== undefined ? termination_date : null},
        is_resident = COALESCE(${is_resident !== undefined ? is_resident : null}, is_resident),
        is_pensioner = COALESCE(${is_pensioner !== undefined ? is_pensioner : null}, is_pensioner),
        has_disability = COALESCE(${has_disability !== undefined ? has_disability : null}, has_disability)
      WHERE id = ${employeeId} AND company_id = ${id}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ employee: result.rows[0] });
  } catch (error) {
    console.error('Update employee error:', error);
    return NextResponse.json(
      { error: 'Failed to update employee' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; employeeId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, employeeId } = await params;

  if (!(await verifyCompanyOwnership(id, user.id))) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  const result = await sql`
    DELETE FROM employees WHERE id = ${employeeId} AND company_id = ${id} RETURNING id
  `;

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
