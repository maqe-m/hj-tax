// TODO: User must verify these rates against Налоговый кодекс РК 2026.
// These are scaffolding defaults.

const SIMPLIFIED_RATE = 0.03; // 3% от дохода

interface SimplifiedTaxInput {
  revenue: number;
  regime: 'simplified_new' | 'simplified_old';
  employee_count?: number;
  total_opv?: number;
  total_so?: number;
}

export interface SimplifiedTaxResult {
  revenue: number;
  tax_rate: string;
  gross_tax: number;
  opv_deduction: number;
  so_deduction: number;
  net_tax: number;
  per_payment: number;
  steps: string[];
}

export function calculateSimplifiedTax(input: SimplifiedTaxInput): SimplifiedTaxResult {
  const { revenue, total_opv = 0, total_so = 0 } = input;
  const steps: string[] = [];

  // Step 1: Gross tax — 3% от дохода
  const gross_tax = Math.round(revenue * SIMPLIFIED_RATE);
  steps.push(`Налог (3%): ${revenue.toLocaleString()} × 3% = ${gross_tax.toLocaleString()} ₸`);

  // Step 2: Deductions — ОПВ и СО за работников
  const opv_deduction = total_opv;
  const so_deduction = total_so;
  steps.push(
    `Вычеты: ОПВ за работников = ${opv_deduction.toLocaleString()} ₸, СО = ${so_deduction.toLocaleString()} ₸`
  );

  // Step 3: Net tax
  let net_tax = gross_tax - opv_deduction - so_deduction;
  if (net_tax < 0) net_tax = 0;
  steps.push(
    `Итого налог: ${gross_tax.toLocaleString()} - ${opv_deduction.toLocaleString()} - ${so_deduction.toLocaleString()} = ${net_tax.toLocaleString()} ₸`
  );

  // Step 4: Split into two payments
  const per_payment = Math.round(net_tax / 2);
  steps.push(
    `Уплата в два этапа: ${per_payment.toLocaleString()} ₸ × 2`
  );

  steps.push(
    `Первый платёж — до 25 числа первого месяца после полугодия`
  );
  steps.push(
    `Второй платёж — до 25 числа второго месяца после полугодия`
  );

  return {
    revenue,
    tax_rate: '3%',
    gross_tax,
    opv_deduction,
    so_deduction,
    net_tax,
    per_payment,
    steps,
  };
}
