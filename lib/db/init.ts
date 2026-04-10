import { sql } from '@vercel/postgres';
import { readFileSync } from 'fs';
import { join } from 'path';
import { hashPassword } from '@/lib/auth/password';

export async function initializeDatabase() {
  const schemaPath = join(process.cwd(), 'lib', 'db', 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  // Split by semicolons and execute each statement
  const statements = schema
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    await sql.query(statement);
  }

  // Seed superadmin account
  const existing = await sql`SELECT id FROM users WHERE email = 'magzhan@hj.fit'`;
  if (existing.rows.length === 0) {
    const hash = await hashPassword('HjTax2026!');
    await sql`
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES ('magzhan@hj.fit', ${hash}, 'Magzhan Muratov', 'owner')
    `;
  }

  return { success: true, tables: statements.length };
}
