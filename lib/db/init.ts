import { sql } from '@vercel/postgres';
import { hashPassword } from '@/lib/auth/password';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'accountant')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  bin CHAR(12) NOT NULL,
  tax_regime VARCHAR(30) NOT NULL CHECK (tax_regime IN ('simplified_new', 'simplified_old', 'general', 'retail_tax', 'patent')),
  registration_date DATE,
  vat_payer BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  iin CHAR(12) NOT NULL,
  position VARCHAR(255),
  salary_gross NUMERIC(12, 2),
  hire_date DATE,
  termination_date DATE,
  is_resident BOOLEAN DEFAULT TRUE,
  is_pensioner BOOLEAN DEFAULT FALSE,
  has_disability BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tax_obligations (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tax_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(14, 2),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'calculated', 'paid', 'overdue')),
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  title VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tax_news (
  id SERIAL PRIMARY KEY,
  source_url TEXT,
  title VARCHAR(500) NOT NULL,
  summary TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  relevance_score INTEGER CHECK (relevance_score BETWEEN 1 AND 10)
);
`;

export async function initializeDatabase() {
  const statements = SCHEMA
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
