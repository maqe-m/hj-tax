'use client';

import { useState } from 'react';
import Link from 'next/link';
import { calculateSimplifiedTax, type SimplifiedTaxResult } from '@/lib/calculators/simplified-tax';

export default function SimplifiedCalculatorPage() {
  const [revenue, setRevenue] = useState('');
  const [totalOpv, setTotalOpv] = useState('');
  const [totalSo, setTotalSo] = useState('');
  const [result, setResult] = useState<SimplifiedTaxResult | null>(null);

  function handleCalculate(e: React.FormEvent) {
    e.preventDefault();
    const rev = parseFloat(revenue);
    if (isNaN(rev) || rev <= 0) return;

    const res = calculateSimplifiedTax({
      revenue: rev,
      regime: 'simplified_new',
      total_opv: parseFloat(totalOpv) || 0,
      total_so: parseFloat(totalSo) || 0,
    });
    setResult(res);
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/calculators" className="text-blue-600 hover:underline text-sm">
        ← Все калькуляторы
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-6">Калькулятор упрощённой декларации (3%)</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <form onSubmit={handleCalculate} className="bg-white rounded-xl shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Доход за полугодие, ₸
            </label>
            <input
              type="number"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              required
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="10000000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Сумма ОПВ за работников за полугодие, ₸
            </label>
            <input
              type="number"
              value={totalOpv}
              onChange={(e) => setTotalOpv(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
            <p className="text-xs text-gray-400 mt-1">Вычитается из суммы налога</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Сумма СО за работников за полугодие, ₸
            </label>
            <input
              type="number"
              value={totalSo}
              onChange={(e) => setTotalSo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
            <p className="text-xs text-gray-400 mt-1">Вычитается из суммы налога</p>
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Рассчитать
          </button>
        </form>

        {result && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="font-semibold mb-4">Результат</h2>
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  <tr>
                    <td className="py-2 text-gray-600">Доход за полугодие</td>
                    <td className="py-2 text-right">{result.revenue.toLocaleString()} ₸</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-600">Ставка</td>
                    <td className="py-2 text-right">{result.tax_rate}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-600">Начислено налога</td>
                    <td className="py-2 text-right">{result.gross_tax.toLocaleString()} ₸</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-600">Вычет ОПВ</td>
                    <td className="py-2 text-right text-green-600">-{result.opv_deduction.toLocaleString()} ₸</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-600">Вычет СО</td>
                    <td className="py-2 text-right text-green-600">-{result.so_deduction.toLocaleString()} ₸</td>
                  </tr>
                  <tr className="font-bold text-lg">
                    <td className="py-3">Итого к уплате</td>
                    <td className="py-3 text-right text-blue-700">{result.net_tax.toLocaleString()} ₸</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-600">Каждый платёж (1/2)</td>
                    <td className="py-2 text-right">{result.per_payment.toLocaleString()} ₸</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="font-semibold mb-3">Пошаговый расчёт</h2>
              <ol className="list-decimal list-inside text-sm space-y-1 text-gray-700">
                {result.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>

            <Link
              href={`/chat?context=${encodeURIComponent(`Расчёт по упрощёнке: доход ${result.revenue.toLocaleString()} ₸, налог 3% = ${result.gross_tax.toLocaleString()} ₸, итого к уплате ${result.net_tax.toLocaleString()} ₸`)}`}
              className="block text-center px-4 py-3 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors"
            >
              Спросить AI об этом расчёте
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
