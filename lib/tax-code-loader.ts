import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

export interface TaxCodeSection {
  id: string;
  title: string;
  keywords: string[];
  articles: number[];
  content: string;
  filePath: string;
}

const TAX_CODE_DIR = join(process.cwd(), 'tax-code');

export function loadAllSections(): TaxCodeSection[] {
  try {
    const files = readdirSync(TAX_CODE_DIR).filter(
      (f) => f.endsWith('.md') && !f.startsWith('_') && f !== 'README.md'
    );

    return files.map((file) => {
      const filePath = join(TAX_CODE_DIR, file);
      const raw = readFileSync(filePath, 'utf-8');
      const { data, content } = matter(raw);

      return {
        id: data.id || file.replace('.md', ''),
        title: data.title || '',
        keywords: data.keywords || [],
        articles: data.articles || [],
        content: content.trim(),
        filePath: file,
      };
    });
  } catch {
    return [];
  }
}

export function findRelevantSections(
  query: string,
  companyContext?: { tax_regime: string }
): TaxCodeSection[] {
  const sections = loadAllSections();
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);

  // Extract article numbers from query (e.g., "статья 697" or "ст. 697")
  const articleNumbers: number[] = [];
  const articleMatch = query.match(/(?:стать[яюи]|ст\.?)\s*(\d+)/gi);
  if (articleMatch) {
    for (const m of articleMatch) {
      const num = m.match(/(\d+)/);
      if (num) articleNumbers.push(parseInt(num[1]));
    }
  }

  const scored = sections.map((section) => {
    let score = 0;

    // Keyword matching
    for (const keyword of section.keywords) {
      const kw = keyword.toLowerCase();
      if (queryLower.includes(kw)) {
        score += 10;
      }
      // Partial match
      for (const word of queryWords) {
        if (kw.includes(word) || word.includes(kw)) {
          score += 3;
        }
      }
    }

    // Article number matching
    for (const articleNum of articleNumbers) {
      if (section.articles.includes(articleNum)) {
        score += 20;
      }
    }

    // Content matching
    for (const word of queryWords) {
      if (section.content.toLowerCase().includes(word)) {
        score += 1;
      }
    }

    // Tax regime boost
    if (companyContext?.tax_regime) {
      const regimeKeywords: Record<string, string[]> = {
        simplified_new: ['упрощён', 'упрощен', 'simplified', 'снр', '910'],
        simplified_old: ['упрощён', 'упрощен', 'simplified', 'снр', '910'],
        general: ['общеустановлен', 'general', 'кпн', 'ипн'],
        retail_tax: ['розничн', 'retail'],
        patent: ['патент', 'patent'],
      };

      const boostKeywords = regimeKeywords[companyContext.tax_regime] || [];
      for (const kw of boostKeywords) {
        if (section.keywords.some((k) => k.toLowerCase().includes(kw))) {
          score += 5;
        }
      }
    }

    return { section, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => s.section);
}

export function formatSectionsForPrompt(sections: TaxCodeSection[]): string {
  if (sections.length === 0) {
    return 'Релевантные разделы Налогового кодекса не найдены. Отвечай на основе общих знаний, но предупреди пользователя.';
  }

  return sections
    .map(
      (s) =>
        `--- ${s.title} (${s.filePath}) ---\n` +
        (s.articles.length > 0 ? `Статьи: ${s.articles.join(', ')}\n\n` : '\n') +
        s.content
    )
    .join('\n\n');
}
