'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TAX_REGIMES } from '@/lib/tax-regimes';

interface Company {
  id: number;
  name: string;
  bin: string;
  tax_regime: string;
  vat_payer: boolean;
  created_at: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/companies')
      .then((res) => res.json())
      .then((data) => setCompanies(data.companies || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse text-gray-400">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Компании</h1>
        <Link
          href="/companies/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Добавить компанию
        </Link>
      </div>

      {companies.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow">
          <p className="text-gray-500 mb-4">У вас пока нет компаний</p>
          <Link
            href="/companies/new"
            className="text-blue-600 hover:underline"
          >
            Добавить первую компанию
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Link
              key={company.id}
              href={`/companies/${company.id}`}
              className="bg-white rounded-xl shadow p-6 hover:shadow-md transition-shadow"
            >
              <h2 className="font-semibold text-lg mb-1">{company.name}</h2>
              <p className="text-sm text-gray-500 mb-3">БИН: {company.bin}</p>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                  {TAX_REGIMES[company.tax_regime as keyof typeof TAX_REGIMES]?.label || company.tax_regime}
                </span>
                {company.vat_payer && (
                  <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                    НДС
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
