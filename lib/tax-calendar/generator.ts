import { DEADLINES_BY_REGIME, type DeadlineTemplate } from './deadlines';

interface Company {
  id: number;
  tax_regime: string;
}

export interface GeneratedObligation {
  company_id: number;
  tax_type: string;
  period_start: string;
  period_end: string;
  due_date: string;
  status: string;
  notes: string;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function getPeriodsForTemplate(
  template: DeadlineTemplate,
  fromDate: Date,
  toDate: Date
): { periodStart: Date; periodEnd: Date; dueDate: Date }[] {
  const periods: { periodStart: Date; periodEnd: Date; dueDate: Date }[] = [];

  let current = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);

  while (current < toDate) {
    let periodStart: Date;
    let periodEnd: Date;

    if (template.period === 'monthly') {
      periodStart = new Date(current);
      periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      const dueMonth = addMonths(periodEnd, template.due_month_offset);
      const dueDate = new Date(dueMonth.getFullYear(), dueMonth.getMonth(), template.due_day);
      periods.push({ periodStart, periodEnd, dueDate });
      current = addMonths(current, 1);
    } else if (template.period === 'quarterly') {
      const quarterStart = Math.floor(current.getMonth() / 3) * 3;
      periodStart = new Date(current.getFullYear(), quarterStart, 1);
      periodEnd = new Date(current.getFullYear(), quarterStart + 3, 0);
      const dueMonth = addMonths(periodEnd, template.due_month_offset);
      const dueDate = new Date(dueMonth.getFullYear(), dueMonth.getMonth(), template.due_day);

      // Only add if not already in list
      const key = `${formatDate(periodStart)}-${formatDate(periodEnd)}`;
      if (!periods.some((p) => `${formatDate(p.periodStart)}-${formatDate(p.periodEnd)}` === key)) {
        periods.push({ periodStart, periodEnd, dueDate });
      }
      current = addMonths(periodStart, 3);
    } else if (template.period === 'half_year') {
      const halfStart = current.getMonth() < 6 ? 0 : 6;
      periodStart = new Date(current.getFullYear(), halfStart, 1);
      periodEnd = new Date(current.getFullYear(), halfStart + 6, 0);
      const dueMonth = addMonths(periodEnd, template.due_month_offset);
      const dueDate = new Date(dueMonth.getFullYear(), dueMonth.getMonth(), template.due_day);

      const key = `${formatDate(periodStart)}-${formatDate(periodEnd)}`;
      if (!periods.some((p) => `${formatDate(p.periodStart)}-${formatDate(p.periodEnd)}` === key)) {
        periods.push({ periodStart, periodEnd, dueDate });
      }
      current = addMonths(periodStart, 6);
    } else if (template.period === 'annual') {
      periodStart = new Date(current.getFullYear(), 0, 1);
      periodEnd = new Date(current.getFullYear(), 11, 31);
      const dueDate = new Date(current.getFullYear() + 1, template.due_month_offset - 1, template.due_day);

      const key = `${formatDate(periodStart)}-${formatDate(periodEnd)}`;
      if (!periods.some((p) => `${formatDate(p.periodStart)}-${formatDate(p.periodEnd)}` === key)) {
        periods.push({ periodStart, periodEnd, dueDate });
      }
      current = addMonths(periodStart, 12);
    } else {
      break;
    }
  }

  return periods.filter((p) => p.dueDate >= fromDate && p.dueDate <= toDate);
}

export function generateObligations(
  company: Company,
  fromDate: Date,
  toDate: Date
): GeneratedObligation[] {
  const templates = DEADLINES_BY_REGIME[company.tax_regime] || [];
  const obligations: GeneratedObligation[] = [];

  for (const template of templates) {
    const periods = getPeriodsForTemplate(template, fromDate, toDate);

    for (const period of periods) {
      obligations.push({
        company_id: company.id,
        tax_type: `${template.name} (${template.tax_type})`,
        period_start: formatDate(period.periodStart),
        period_end: formatDate(period.periodEnd),
        due_date: formatDate(period.dueDate),
        status: 'pending',
        notes: template.description,
      });
    }
  }

  return obligations.sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );
}
