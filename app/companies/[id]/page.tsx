'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { TAX_REGIMES } from '@/lib/tax-regimes';

interface Company {
  id: number;
  name: string;
  bin: string;
  tax_regime: string;
  registration_date: string;
  vat_payer: boolean;
  notes: string;
  created_at: string;
}

interface Employee {
  id: number;
  full_name: string;
  iin: string;
  position: string;
  salary_gross: number;
  hire_date: string;
  termination_date: string | null;
  is_resident: boolean;
  is_pensioner: boolean;
  has_disability: boolean;
}

interface TaxObligation {
  id: number;
  tax_type: string;
  period_start: string;
  period_end: string;
  due_date: string;
  amount: number | null;
  status: string;
  notes: string;
}

const TABS = ['overview', 'employees', 'tax-calendar', 'documents', 'chat'] as const;
const TAB_LABELS: Record<string, string> = {
  overview: 'Обзор',
  employees: 'Сотрудники',
  'tax-calendar': 'Налоговый календарь',
  documents: 'Документы',
  chat: 'AI Чат',
};

export default function CompanyDetailPage() {
  const params = useParams();
  const companyId = params.id as string;
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [obligations, setObligations] = useState<TaxObligation[]>([]);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [loading, setLoading] = useState(true);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [employeeLoading, setEmployeeLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/companies/${companyId}`)
      .then((res) => res.json())
      .then((data) => setCompany(data.company))
      .finally(() => setLoading(false));
  }, [companyId]);

  useEffect(() => {
    if (activeTab === 'employees') {
      fetch(`/api/companies/${companyId}/employees`)
        .then((res) => res.json())
        .then((data) => setEmployees(data.employees || []));
    }
    if (activeTab === 'tax-calendar') {
      fetch(`/api/companies/${companyId}/tax-calendar`)
        .then((res) => res.json())
        .then((data) => setObligations(data.obligations || []));
    }
  }, [activeTab, companyId]);

  async function handleAddEmployee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmployeeLoading(true);
    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch(`/api/companies/${companyId}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.get('full_name'),
          iin: form.get('iin'),
          position: form.get('position'),
          salary_gross: parseFloat(form.get('salary_gross') as string) || 0,
          hire_date: form.get('hire_date') || null,
          is_resident: form.get('is_resident') === 'on',
          is_pensioner: form.get('is_pensioner') === 'on',
          has_disability: form.get('has_disability') === 'on',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setEmployees([...employees, data.employee]);
        setShowEmployeeForm(false);
      }
    } finally {
      setEmployeeLoading(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-gray-400">Загрузка...</div>;
  }

  if (!company) {
    return <div className="p-8 text-red-500">Компания не найдена</div>;
  }

  const regimeInfo = TAX_REGIMES[company.tax_regime as keyof typeof TAX_REGIMES];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <Link href="/companies" className="text-blue-600 hover:underline text-sm">
          ← Все компании
        </Link>
        <h1 className="text-2xl font-bold mt-2">{company.name}</h1>
        <p className="text-gray-500">БИН: {company.bin}</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {TAB_LABELS[tab]}
              {tab === 'employees' && employees.length > 0 && (
                <span className="ml-1 text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">
                  {employees.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-xl shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Налоговый режим</h3>
              <p className="mt-1 font-medium">{regimeInfo?.label || company.tax_regime}</p>
              {regimeInfo && <p className="text-sm text-gray-500 mt-1">{regimeInfo.description}</p>}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Плательщик НДС</h3>
              <p className="mt-1">{company.vat_payer ? 'Да' : 'Нет'}</p>
            </div>
            {company.registration_date && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Дата регистрации</h3>
                <p className="mt-1">{new Date(company.registration_date).toLocaleDateString('ru-RU')}</p>
              </div>
            )}
            {company.notes && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-gray-500">Заметки</h3>
                <p className="mt-1 text-gray-700">{company.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'employees' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Сотрудники</h2>
            <button
              onClick={() => setShowEmployeeForm(!showEmployeeForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              {showEmployeeForm ? 'Отмена' : 'Добавить сотрудника'}
            </button>
          </div>

          {showEmployeeForm && (
            <form onSubmit={handleAddEmployee} className="bg-white rounded-xl shadow p-6 mb-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ФИО *</label>
                  <input name="full_name" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ИИН *</label>
                  <input name="iin" required maxLength={12} minLength={12} pattern="[0-9]{12}" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Должность</label>
                  <input name="position" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Зарплата (gross)</label>
                  <input name="salary_gross" type="number" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Дата найма</label>
                  <input name="hire_date" type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input name="is_resident" type="checkbox" defaultChecked className="h-4 w-4" /> Резидент
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input name="is_pensioner" type="checkbox" className="h-4 w-4" /> Пенсионер
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input name="has_disability" type="checkbox" className="h-4 w-4" /> Инвалидность
                </label>
              </div>
              <button
                type="submit"
                disabled={employeeLoading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {employeeLoading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </form>
          )}

          {employees.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-xl shadow">
              <p className="text-gray-500">Сотрудники не добавлены</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-600">ФИО</th>
                    <th className="text-left p-3 font-medium text-gray-600">ИИН</th>
                    <th className="text-left p-3 font-medium text-gray-600">Должность</th>
                    <th className="text-right p-3 font-medium text-gray-600">Зарплата</th>
                    <th className="text-left p-3 font-medium text-gray-600">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="p-3">{emp.full_name}</td>
                      <td className="p-3 text-gray-500">{emp.iin}</td>
                      <td className="p-3">{emp.position || '—'}</td>
                      <td className="p-3 text-right">{emp.salary_gross ? `${Number(emp.salary_gross).toLocaleString()} ₸` : '—'}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {emp.is_resident && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Р</span>}
                          {emp.is_pensioner && <span className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">П</span>}
                          {emp.has_disability && <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">И</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tax-calendar' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Налоговый календарь</h2>
            <button
              onClick={async () => {
                await fetch(`/api/companies/${companyId}/tax-calendar/generate`, { method: 'POST' });
                const res = await fetch(`/api/companies/${companyId}/tax-calendar`);
                const data = await res.json();
                setObligations(data.obligations || []);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Сгенерировать на 12 мес.
            </button>
          </div>

          {obligations.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-xl shadow">
              <p className="text-gray-500">Нет налоговых обязательств. Нажмите кнопку выше для генерации.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {obligations.map((obl) => (
                <div key={obl.id} className="bg-white rounded-xl shadow p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{obl.tax_type}</p>
                    <p className="text-sm text-gray-500">
                      Срок: {new Date(obl.due_date).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {obl.amount && <span className="font-medium">{Number(obl.amount).toLocaleString()} ₸</span>}
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      obl.status === 'paid' ? 'bg-green-50 text-green-700' :
                      obl.status === 'overdue' ? 'bg-red-50 text-red-700' :
                      obl.status === 'calculated' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-gray-50 text-gray-700'
                    }`}>
                      {obl.status === 'paid' ? 'Оплачено' :
                       obl.status === 'overdue' ? 'Просрочено' :
                       obl.status === 'calculated' ? 'Рассчитано' : 'Ожидает'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="text-center py-12 bg-white rounded-xl shadow">
          <p className="text-gray-500">Документы — будет доступно в следующих версиях</p>
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <p className="text-gray-500 mb-4">AI чат с контекстом компании</p>
          <Link
            href={`/companies/${companyId}/chat`}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block"
          >
            Открыть чат
          </Link>
        </div>
      )}
    </div>
  );
}
