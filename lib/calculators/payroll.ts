// TODO: User must verify these rates against Налоговый кодекс РК 2026.
// These are scaffolding defaults. Rates may have changed.

// 2026 rates (verify against current legislation):
const MZP = 85000; // Минимальная заработная плата (TODO: verify for 2026)
const OPV_RATE = 0.10; // 10% — обязательные пенсионные взносы
const VOSMS_RATE = 0.02; // 2% — взносы на ОСМС (работник)
const OSMS_RATE = 0.03; // 3% — отчисления на ОСМС (работодатель)
const SO_RATE = 0.035; // 3.5% — социальные отчисления
const IPN_RATE = 0.10; // 10% — индивидуальный подоходный налог
const SN_RATE = 0.095; // 9.5% — социальный налог (для ТОО на общем режиме)
const IPN_DEDUCTION = 14 * MZP / 12; // Ежемесячный вычет (14 МРП — TODO: verify)

interface PayrollInput {
  gross_salary: number;
  is_resident: boolean;
  is_pensioner: boolean;
  has_disability: boolean;
}

export interface PayrollResult {
  gross_salary: number;
  opv: number;
  opv_rate: string;
  vosms: number;
  vosms_rate: string;
  taxable_income: number;
  ipn_deduction: number;
  ipn: number;
  ipn_rate: string;
  net_salary: number;
  osms: number;
  osms_rate: string;
  so: number;
  so_rate: string;
  so_base: number;
  sn: number;
  sn_rate: string;
  sn_base: number;
  total_employer_cost: number;
  steps: string[];
}

export function calculatePayroll(input: PayrollInput): PayrollResult {
  const { gross_salary, is_resident, is_pensioner, has_disability } = input;
  const steps: string[] = [];

  // Step 1: ОПВ (обязательные пенсионные взносы) — 10%
  // Пенсионеры не платят ОПВ
  const opv = is_pensioner ? 0 : Math.round(gross_salary * OPV_RATE);
  steps.push(
    is_pensioner
      ? `ОПВ: 0 ₸ (пенсионер освобождён)`
      : `ОПВ: ${gross_salary.toLocaleString()} × 10% = ${opv.toLocaleString()} ₸`
  );

  // Step 2: ВОСМС (взносы работника) — 2%
  const vosms = Math.round(gross_salary * VOSMS_RATE);
  steps.push(`ВОСМС (работник): ${gross_salary.toLocaleString()} × 2% = ${vosms.toLocaleString()} ₸`);

  // Step 3: Taxable income = gross - OPV - VOSMS - deduction
  const deduction = is_resident ? IPN_DEDUCTION : 0;
  let taxable_income = gross_salary - opv - vosms - deduction;
  if (taxable_income < 0) taxable_income = 0;
  steps.push(
    `Облагаемый доход: ${gross_salary.toLocaleString()} - ${opv.toLocaleString()} (ОПВ) - ${vosms.toLocaleString()} (ВОСМС) - ${Math.round(deduction).toLocaleString()} (вычет) = ${taxable_income.toLocaleString()} ₸`
  );

  // Step 4: ИПН — 10% from taxable income
  let ipn = Math.round(taxable_income * IPN_RATE);
  if (has_disability) {
    ipn = 0;
    steps.push(`ИПН: 0 ₸ (инвалид освобождён от ИПН)`);
  } else {
    steps.push(`ИПН: ${taxable_income.toLocaleString()} × 10% = ${ipn.toLocaleString()} ₸`);
  }

  // Step 5: Net salary
  const net_salary = gross_salary - opv - vosms - ipn;
  steps.push(
    `На руки: ${gross_salary.toLocaleString()} - ${opv.toLocaleString()} - ${vosms.toLocaleString()} - ${ipn.toLocaleString()} = ${net_salary.toLocaleString()} ₸`
  );

  // Employer costs:
  // Step 6: ОСМС (работодатель) — 3%
  const osms = Math.round(gross_salary * OSMS_RATE);
  steps.push(`ОСМС (работодатель): ${gross_salary.toLocaleString()} × 3% = ${osms.toLocaleString()} ₸`);

  // Step 7: СО (социальные отчисления) — 3.5% от (gross - OPV)
  const so_base = gross_salary - opv;
  let so = Math.round(so_base * SO_RATE);
  if (so < Math.round(MZP * SO_RATE)) {
    so = Math.round(MZP * SO_RATE);
  }
  steps.push(`СО: (${gross_salary.toLocaleString()} - ${opv.toLocaleString()}) × 3.5% = ${so.toLocaleString()} ₸`);

  // Step 8: СН (социальный налог) — 9.5% от (gross - OPV) - СО
  const sn_base = gross_salary - opv;
  let sn = Math.round(sn_base * SN_RATE) - so;
  if (sn < 0) sn = 0;
  steps.push(`СН: (${gross_salary.toLocaleString()} - ${opv.toLocaleString()}) × 9.5% - ${so.toLocaleString()} (СО) = ${sn.toLocaleString()} ₸`);

  const total_employer_cost = gross_salary + osms + so + sn;
  steps.push(`Итого расходы работодателя: ${total_employer_cost.toLocaleString()} ₸`);

  return {
    gross_salary,
    opv,
    opv_rate: '10%',
    vosms,
    vosms_rate: '2%',
    taxable_income,
    ipn_deduction: Math.round(deduction),
    ipn,
    ipn_rate: '10%',
    net_salary,
    osms,
    osms_rate: '3%',
    so,
    so_rate: '3.5%',
    so_base,
    sn,
    sn_rate: '9.5%',
    sn_base,
    total_employer_cost,
    steps,
  };
}
