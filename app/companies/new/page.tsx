'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TAX_REGIMES } from '@/lib/tax-regimes';

export default function NewCompanyPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRegime, setSelectedRegime] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          bin: form.get('bin'),
          tax_regime: form.get('tax_regime'),
          registration_date: form.get('registration_date') || null,
          vat_payer: form.get('vat_payer') === 'on',
          notes: form.get('notes') || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create company');
        return;
      }

      router.push(`/companies/${data.company.id}`);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/companies" className="text-blue-600 hover:underline text-sm">
          ← Назад к компаниям
        </Link>
        <h1 className="text-2xl font-bold mt-2">Добавить компанию</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Название компании *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ТОО «Название»"
          />
        </div>

        <div>
          <label htmlFor="bin" className="block text-sm font-medium text-gray-700 mb-1">
            БИН *
          </label>
          <input
            id="bin"
            name="bin"
            type="text"
            required
            maxLength={12}
            minLength={12}
            pattern="[0-9]{12}"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="123456789012"
          />
          <p className="text-xs text-gray-400 mt-1">12 цифр</p>
        </div>

        <div>
          <label htmlFor="tax_regime" className="block text-sm font-medium text-gray-700 mb-1">
            Налоговый режим *
          </label>
          <select
            id="tax_regime"
            name="tax_regime"
            required
            value={selectedRegime}
            onChange={(e) => setSelectedRegime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Выберите режим</option>
            {Object.entries(TAX_REGIMES).map(([key, regime]) => (
              <option key={key} value={key}>
                {regime.label}
              </option>
            ))}
          </select>
          {selectedRegime && (
            <p className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded">
              {TAX_REGIMES[selectedRegime as keyof typeof TAX_REGIMES]?.description}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="registration_date" className="block text-sm font-medium text-gray-700 mb-1">
            Дата регистрации
          </label>
          <input
            id="registration_date"
            name="registration_date"
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="vat_payer"
            name="vat_payer"
            type="checkbox"
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="vat_payer" className="text-sm text-gray-700">
            Плательщик НДС
          </label>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Заметки
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Дополнительная информация о компании..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Создание...' : 'Создать компанию'}
        </button>
      </form>
    </div>
  );
}
