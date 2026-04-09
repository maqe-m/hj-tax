import { findRelevantSections, formatSectionsForPrompt } from '@/lib/tax-code-loader';

interface CompanyContext {
  name: string;
  bin: string;
  tax_regime: string;
  vat_payer: boolean;
}

const REGIME_LABELS: Record<string, string> = {
  simplified_new: 'Упрощённый (новый)',
  simplified_old: 'Упрощённый (старый)',
  general: 'Общеустановленный',
  retail_tax: 'Розничный налог',
  patent: 'Патент',
};

export function buildSystemPrompt(
  query: string,
  company?: CompanyContext | null
): string {
  const sections = findRelevantSections(query, company ? { tax_regime: company.tax_regime } : undefined);
  const formattedSections = formatSectionsForPrompt(sections);

  let prompt = `Ты — экспертный консультант по налоговому и бухгалтерскому учёту Республики Казахстан.
Ты опираешься ИСКЛЮЧИТЕЛЬНО на Налоговый кодекс РК (редакция 2026 года) и официальные разъяснения КГД.

`;

  if (company) {
    prompt += `Текущий контекст: компания "${company.name}", БИН ${company.bin}, налоговый режим: ${REGIME_LABELS[company.tax_regime] || company.tax_regime}, плательщик НДС: ${company.vat_payer ? 'Да' : 'Нет'}.

`;
  }

  prompt += `Релевантные разделы кодекса:
${formattedSections}

Правила:
- Если вопрос выходит за рамки предоставленных разделов кодекса — честно скажи об этом и попроси уточнить.
- Все расчёты показывай пошагово.
- Цитируй статьи кодекса с номерами.
- Не давай советов, противоречащих кодексу.
- Отвечай на русском.`;

  return prompt;
}
