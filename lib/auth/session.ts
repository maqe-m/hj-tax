import { cookies } from 'next/headers';
import { sql } from '@vercel/postgres';
import { verifyToken } from './jwt';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  try {
    const result = await sql`
      SELECT id, email, full_name, role FROM users WHERE id = ${payload.userId}
    `;
    if (result.rows.length === 0) return null;
    return result.rows[0] as User;
  } catch {
    return null;
  }
}
