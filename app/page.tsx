'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TAX_REGIMES } from '@/lib/tax-regimes';

interface User {
  full_name: string;
}

interface Company {
  id: number;
  name: string;
  tax_regime: string;
}

interface ChatSession {
  id: number;
  title: string;
  company_name: string | null;
  updated_at: string;
}

interface TaxObligation {
  id: number;
  tax_type: string;
  due_date: string;
  status: string;
  company_id: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [deadlines, setDeadlines] = useState<TaxObligation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/companies').then((r) => r.json()),
      fetch('/api/chat/sessions').then((r) => r.json()),
    ])
      .then(([userData, companiesData, sessionsData]) => {
        setUser(userData.user || null);
        setCompanies(companiesData.companies || []);
        setSessions((sessionsData.sessions || []).slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  // Count companies by regime
  const regimeCounts: Record<string, number> = {};
  for (const c of companies) {
    regimeCounts[c.tax_regime] = (regimeCounts[c.tax_regime] || 0) + 1;
  }

  if (loading) {
    return <div className="p-8 text-gray-400">Загрузка...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Greeting */}
      <h1 className="text-2xl font-bold mb-1">
        {user ? `Добро пожаловать, ${user.full_name}` : 'Добро пожаловать'}
      </h1>
      <p className="text-gray-500 mb-8">Панель управления KZ Tax Advisor</p>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link
          href="/chat"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          Новый чат
        </Link>
        <Link
          href="/companies/new"
          className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
        >
          Добавить компанию
        </Link>
        <Link
          href="/calculators"
          className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
        >
          Калькуляторы
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Companies summary */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Компании</h2>
            <span className="text-sm text-gray-400">{companies.length}</span>
          </div>

          {companies.length === 0 ? (
            <p className="text-sm text-gray-400">
              Нет компаний.{' '}
              <Link href="/companies/new" className="text-blue-600 hover:underline">
                Добавить
              </Link>
            </p>
          ) : (
            <div className="space-y-2">
              {Object.entries(regimeCounts).map(([regime, count]) => (
                <div key={regime} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {TAX_REGIMES[regime as keyof typeof TAX_REGIMES]?.label || regime}
                  </span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          )}

          {companies.length > 0 && (
            <Link href="/companies" className="text-blue-600 text-sm hover:underline mt-3 block">
              Все компании →
            </Link>
          )}
        </div>

        {/* Upcoming deadlines */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold mb-4">Ближайшие дедлайны</h2>

          {deadlines.length === 0 ? (
            <p className="text-sm text-gray-400">
              Нет предстоящих дедлайнов. Сгенерируйте налоговый календарь для компании.
            </p>
          ) : (
            <div className="space-y-3">
              {deadlines.slice(0, 5).map((d) => (
                <div key={d.id} className="flex justify-between items-center text-sm">
                  <span className="truncate mr-2">{d.tax_type}</span>
                  <span className="text-gray-500 whitespace-nowrap">
                    {new Date(d.due_date).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent chats */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold mb-4">Последние чаты</h2>

          {sessions.length === 0 ? (
            <p className="text-sm text-gray-400">
              Нет чатов.{' '}
              <Link href="/chat" className="text-blue-600 hover:underline">
                Начать
              </Link>
            </p>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <Link
                  key={s.id}
                  href="/chat"
                  className="block text-sm hover:text-blue-600 truncate"
                >
                  {s.title}
                  {s.company_name && (
                    <span className="text-xs text-gray-400 ml-1">({s.company_name})</span>
                  )}
                </Link>
              ))}
            </div>
          )}

          {sessions.length > 0 && (
            <Link href="/chat" className="text-blue-600 text-sm hover:underline mt-3 block">
              Все чаты →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
