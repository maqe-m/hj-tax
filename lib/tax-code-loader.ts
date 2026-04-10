import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import matter from 'gray-matter';

export interface TaxCodeSection {
  id: string;
  title: string;
  keywords: string[];
  articles: string[];
  content: string;
  filePath: string;
}

const TAX_CODE_DIR = join(process.cwd(), 'tax-code');

function walkMdFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry.startsWith('_') || entry === 'README.md') continue;
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        results.push(...walkMdFiles(fullPath));
      } else if (entry.endsWith('.md')) {
        results.push(fullPath);
      }
    }
  } catch {
    // directory doesn't exist or is unreadable
  }
  return results;
}

export function loadAllSections(): TaxCodeSection[] {
  try {
    const files = walkMdFiles(TAX_CODE_DIR);

    return files.map((fullPath) => {
      const raw = readFileSync(fullPath, 'utf-8');
      const { data, content } = matter(raw);
      const relPath = relative(TAX_CODE_DIR, fullPath);

      return {
        id: data.id || relPath.replace('.md', ''),
        title: data.chapter_title || data.title || '',
        keywords: data.keywords || [],
        articles: (data.articles || []).map(String),
        content: content.trim(),
        filePath: relPath,
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

  // Extract article numbers from query (e.g., "статья 697", "ст. 697", or standalone "697")
  const articleNumbers: string[] = [];
  const articleMatch = query.match(/(?:стать[яюи]|ст\.?)\s*(\d+(?:-\d+)?)/gi);
  if (articleMatch) {
    for (const m of articleMatch) {
      const num = m.match(/(\d+(?:-\d+)?)/);
      if (num) articleNumbers.push(num[1]);
    }
  }
  // Also match standalone numbers (3+ digits) as potential article references
  const standaloneNums = query.match(/\b(\d{3,}(?:-\d+)?)\b/g);
  if (standaloneNums) {
    for (const n of standaloneNums) {
      if (!articleNumbers.includes(n)) articleNumbers.push(n);
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
      if (section.articles.some((a) => a === articleNum)) {
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
