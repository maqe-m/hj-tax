'use client';

import { useState } from 'react';
import Link from 'next/link';
import { calculatePayroll, type PayrollResult } from '@/lib/calculators/payroll';

export default function PayrollCalculatorPage() {
  const [grossSalary, setGrossSalary] = useState('');
  const [isResident, setIsResident] = useState(true);
  const [isPensioner, setIsPensioner] = useState(false);
  const [hasDisability, setHasDisability] = useState(false);
  const [result, setResult] = useState<PayrollResult | null>(null);

  function handleCalculate(e: React.FormEvent) {
    e.preventDefault();
    const salary = parseFloat(grossSalary);
    if (isNaN(salary) || salary <= 0) return;

    const res = calculatePayroll({
      gross_salary: salary,
      is_resident: isResident,
      is_pensioner: isPensioner,
      has_disability: hasDisability,
    });
    setResult(res);
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/calculators" className="text-blue-600 hover:underline text-sm">
        ← Все калькуляторы
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-6">Зарплатный калькулятор</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <form onSubmit={handleCalculate} className="bg-white rounded-xl shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Зарплата (gross), ₸
            </label>
            <input
              type="number"
              value={grossSalary}
              onChange={(e) => setGrossSalary(e.target.value)}
              required
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="300000"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isResident}
                onChange={(e) => setIsResident(e.target.checked)}
                className="h-4 w-4"
              />
              Резидент РК
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPensioner}
                onChange={(e) => setIsPensioner(e.target.checked)}
                className="h-4 w-4"
              />
              Пенсионер
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hasDisability}
                onChange={(e) => setHasDisability(e.target.checked)}
                className="h-4 w-4"
              />
              Инвалидность
            </label>
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
                  <tr className="font-medium">
                    <td className="py-2">Зарплата (gross)</td>
                    <td className="py-2 text-right">{result.gross_salary.toLocaleString()} ₸</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-600">ОПВ ({result.opv_rate})</td>
                    <td className="py-2 text-right text-red-600">-{result.opv.toLocaleString()} ₸</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-600">ВОСМС ({result.vosms_rate})</td>
                    <td className="py-2 text-right text-red-600">-{result.vosms.toLocaleString()} ₸</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-600">Вычет ИПН</td>
                    <td className="py-2 text-right text-green-600">-{result.ipn_deduction.toLocaleString()} ₸</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-600">ИПН ({result.ipn_rate})</td>
                    <td className="py-2 text-right text-red-600">-{result.ipn.toLocaleString()} ₸</td>
                  </tr>
                  <tr className="font-bold text-lg">
                    <td className="py-3">На руки</td>
                    <td className="py-3 text-right text-green-700">{result.net_salary.toLocaleString()} ₸</td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-4 pt-4 border-t">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Расходы работодателя</h3>
                <table className="w-full text-sm">
                  <tbody className="divide-y">
                    <tr>
                      <td className="py-2 text-gray-600">ОСМС ({result.osms_rate})</td>
                      <td className="py-2 text-right">{result.osms.toLocaleString()} ₸</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-600">СО ({result.so_rate})</td>
                      <td className="py-2 text-right">{result.so.toLocaleString()} ₸</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-600">СН ({result.sn_rate})</td>
                      <td className="py-2 text-right">{result.sn.toLocaleString()} ₸</td>
                    </tr>
                    <tr className="font-medium">
                      <td className="py-2">Итого расходы</td>
                      <td className="py-2 text-right">{result.total_employer_cost.toLocaleString()} ₸</td>
                    </tr>
                  </tbody>
                </table>
              </div>
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
              href={`/chat?context=${encodeURIComponent(`Расчёт зарплаты: gross ${result.gross_salary} ₸, net ${result.net_salary} ₸, ИПН ${result.ipn} ₸, ОПВ ${result.opv} ₸`)}`}
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
