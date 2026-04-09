import Link from 'next/link';

const calculators = [
  {
    title: 'Зарплатный калькулятор',
    description: 'Рассчитайте ИПН, ОПВ, ВОСМС, ОСМС, СО, СН и чистую зарплату на руки.',
    href: '/calculators/payroll',
  },
  {
    title: 'Упрощённая декларация (3%)',
    description: 'Рассчитайте налог по упрощённому режиму (форма 910) с учётом вычетов.',
    href: '/calculators/simplified',
  },
];

export default function CalculatorsPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Калькуляторы</h1>

      <div className="grid gap-4 md:grid-cols-2">
        {calculators.map((calc) => (
          <Link
            key={calc.href}
            href={calc.href}
            className="bg-white rounded-xl shadow p-6 hover:shadow-md transition-shadow"
          >
            <h2 className="font-semibold text-lg mb-2">{calc.title}</h2>
            <p className="text-sm text-gray-500">{calc.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
