import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

// ── Types ──────────────────────────────────────────────────────────

type Article = { number: string; title: string; body: string };
type Chapter = {
  section_number: number;
  section_title: string;
  chapter_number: number;
  chapter_title: string;
  articles: Article[];
};

// ── Regex patterns ─────────────────────────────────────────────────

const SECTION_RE = /^РАЗДЕЛ\s+(\d+)\.\s*(.+?)\s*$/;
const CHAPTER_RE = /^Глава\s+(\d+)\.?\s*(.+?)\s*$/;
const ARTICLE_RE = /^Статья\s+(\d+(?:-\d+)?)\.\s*(.+?)\s*$/;

// ── Keyword boosts per section ─────────────────────────────────────

const SECTION_KEYWORD_BOOSTS: Record<number, string[]> = {
  5: ["КПН", "корпоративный подоходный налог", "прибыль организаций", "ТОО", "юридическое лицо"],
  6: ["ИПН", "индивидуальный подоходный налог", "зарплата", "доход физического лица", "ИП"],
  7: ["НДС", "налог на добавленную стоимость", "VAT", "плательщик НДС", "зачёт НДС"],
  9: ["соцналог", "социальный налог", "СН", "работодатель"],
  15: ["нерезидент", "международное налогообложение", "постоянное учреждение"],
  16: ["СНР", "специальный налоговый режим", "упрощёнка", "упрощенка", "упрощённый режим", "патент", "розничный налог", "мобильное приложение", "самозанятый"],
};

// ── Stop-words for keyword filtering ───────────────────────────────

const STOP_WORDS = new Set([
  "для", "при", "или", "иных", "других", "этих", "настоящего", "настоящим",
  "настоящей", "также", "того", "такие", "такой", "этой", "этот", "этим",
  "который", "которые", "которых", "которого", "которым",
]);

// ── Helpers ────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '') // keep letters, numbers, spaces, hyphens
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function extractKeywords(chapterTitle: string, sectionTitle: string, sectionNumber: number): string[] {
  const keywords = new Set<string>();

  const addWords = (text: string) => {
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
      .forEach((w) => keywords.add(w));
  };

  addWords(chapterTitle);
  addWords(sectionTitle);

  const boosts = SECTION_KEYWORD_BOOSTS[sectionNumber];
  if (boosts) {
    boosts.forEach((kw) => keywords.add(kw));
  }

  return Array.from(keywords);
}

function escapeYaml(s: string): string {
  if (/[":#{}\[\],&*?|>!%@`]/.test(s) || s.startsWith("'")) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return `"${s}"`;
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  const ROOT = process.cwd();
  const pdfPath = path.join(ROOT, 'tax-code', '_source', 'nk-rk-2026.pdf');
  const taxCodeDir = path.join(ROOT, 'tax-code');

  // Check PDF exists
  if (!fs.existsSync(pdfPath)) {
    console.error('❌ PDF not found.');
    console.error('   Place the PDF at /tax-code/_source/nk-rk-2026.pdf first.');
    process.exit(1);
  }

  // ── 3g: Idempotent cleanup ───────────────────────────────────────
  const existing = fs.readdirSync(taxCodeDir);
  for (const entry of existing) {
    if (entry.startsWith('раздел-')) {
      fs.rmSync(path.join(taxCodeDir, entry), { recursive: true, force: true });
    }
  }

  // ── 3a: Read PDF ─────────────────────────────────────────────────
  console.log('📖 Reading PDF...');
  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdf = await pdfParse(pdfBuffer);
  const fileSizeMB = (pdfBuffer.length / 1024 / 1024).toFixed(1);
  console.log(`   ${pdf.numpages} pages, ${fileSizeMB} MB`);

  // ── 3b: Pre-clean text ───────────────────────────────────────────
  let text = pdf.text;
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  text = text.replace(/\f/g, '');
  text = text.replace(/[ \t]+$/gm, ''); // trim trailing whitespace per line
  text = text.replace(/\n{4,}/g, '\n\n\n'); // collapse 3+ blank lines into 2

  const lines = text.split('\n');

  // ── 3c: Parse hierarchy ──────────────────────────────────────────
  console.log('🔍 Parsing hierarchy...');

  // Skip preamble — find first РАЗДЕЛ 1.
  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (SECTION_RE.test(lines[i])) {
      const m = lines[i].match(SECTION_RE);
      if (m && m[1] === '1') {
        startIdx = i;
        break;
      }
    }
  }

  const chapters: Chapter[] = [];
  let currentSectionNum = 0;
  let currentSectionTitle = '';
  let currentChapterNum = 0;
  let currentChapterTitle = '';
  let currentArticles: Article[] = [];
  let currentArticleNum = '';
  let currentArticleTitle = '';
  let currentArticleBody: string[] = [];
  let inChapter = false;

  function flushArticle() {
    if (currentArticleNum) {
      currentArticles.push({
        number: currentArticleNum,
        title: currentArticleTitle,
        body: currentArticleBody.join('\n').trim(),
      });
      currentArticleNum = '';
      currentArticleTitle = '';
      currentArticleBody = [];
    }
  }

  function flushChapter() {
    flushArticle();
    if (inChapter && currentChapterNum > 0) {
      chapters.push({
        section_number: currentSectionNum,
        section_title: currentSectionTitle,
        chapter_number: currentChapterNum,
        chapter_title: currentChapterTitle,
        articles: [...currentArticles],
      });
      currentArticles = [];
    }
  }

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];

    // Check for section header
    const secMatch = line.match(SECTION_RE);
    if (secMatch) {
      flushChapter();
      currentSectionNum = parseInt(secMatch[1], 10);
      currentSectionTitle = secMatch[2].trim();
      inChapter = false;
      continue;
    }

    // Check for chapter header
    const chapMatch = line.match(CHAPTER_RE);
    if (chapMatch) {
      flushChapter();
      currentChapterNum = parseInt(chapMatch[1], 10);
      currentChapterTitle = chapMatch[2].trim();
      currentArticles = [];
      inChapter = true;
      continue;
    }

    // Check for article header
    const artMatch = line.match(ARTICLE_RE);
    if (artMatch) {
      flushArticle();
      currentArticleNum = artMatch[1];
      currentArticleTitle = artMatch[2].trim();
      currentArticleBody = [];
      continue;
    }

    // Otherwise, accumulate body text
    if (currentArticleNum) {
      currentArticleBody.push(line);
    }
  }

  // Flush the last chapter/article
  flushChapter();

  // Count unique sections
  const sectionNums = new Set(chapters.map((c) => c.section_number));
  const totalArticles = chapters.reduce((sum, c) => sum + c.articles.length, 0);

  console.log(`   ✓ ${sectionNums.size} sections`);
  console.log(`   ✓ ${chapters.length} chapters`);
  console.log(`   ✓ ${totalArticles} articles`);

  // ── 3e: Write markdown files ─────────────────────────────────────
  console.log('💾 Writing markdown files...');

  for (const chapter of chapters) {
    const sectionSlug = `раздел-${pad2(chapter.section_number)}-${slugify(chapter.section_title)}`;
    const chapterSlug = `глава-${pad2(chapter.chapter_number)}-${slugify(chapter.chapter_title)}`;

    const dirPath = path.join(taxCodeDir, sectionSlug);
    fs.mkdirSync(dirPath, { recursive: true });

    const filePath = path.join(dirPath, `${chapterSlug}.md`);
    const articleNumbers = chapter.articles.map((a) => a.number);
    const keywords = extractKeywords(chapter.chapter_title, chapter.section_title, chapter.section_number);

    // Build frontmatter
    const frontmatter = [
      '---',
      `section_number: ${chapter.section_number}`,
      `section_title: ${escapeYaml(chapter.section_title)}`,
      `chapter_number: ${chapter.chapter_number}`,
      `chapter_title: ${escapeYaml(chapter.chapter_title)}`,
      `articles: [${articleNumbers.map((n) => `"${n}"`).join(', ')}]`,
      `keywords: [${keywords.map((k) => escapeYaml(k)).join(', ')}]`,
      '---',
    ].join('\n');

    // Build body
    const bodyParts: string[] = [
      '',
      `# Глава ${chapter.chapter_number}. ${chapter.chapter_title}`,
      '',
      `_Раздел ${chapter.section_number}. ${chapter.section_title}_`,
      '',
    ];

    for (const article of chapter.articles) {
      bodyParts.push(`## Статья ${article.number}. ${article.title}`);
      bodyParts.push('');
      if (article.body) {
        bodyParts.push(article.body);
        bodyParts.push('');
      }
    }

    const content = frontmatter + bodyParts.join('\n');
    fs.writeFileSync(filePath, content, 'utf-8');

    console.log(`   ✓ ${sectionSlug}/${chapterSlug}.md (${chapter.articles.length} articles)`);
  }

  // ── 3h: Summary table ────────────────────────────────────────────
  console.log('');
  console.log('📊 Summary:');
  console.log('─'.repeat(70));
  console.log(`${'Section'.padEnd(8)} ${'Title'.padEnd(45)} ${'Chap'.padEnd(6)} Articles`);
  console.log('─'.repeat(70));

  const sectionStats: Map<number, { title: string; chapters: number; articles: number }> = new Map();
  for (const ch of chapters) {
    const existing = sectionStats.get(ch.section_number);
    if (existing) {
      existing.chapters++;
      existing.articles += ch.articles.length;
    } else {
      sectionStats.set(ch.section_number, {
        title: ch.section_title,
        chapters: 1,
        articles: ch.articles.length,
      });
    }
  }

  for (const [secNum, stats] of sectionStats) {
    const title = stats.title.length > 43 ? stats.title.substring(0, 40) + '...' : stats.title;
    console.log(`${String(secNum).padEnd(8)} ${title.padEnd(45)} ${String(stats.chapters).padEnd(6)} ${stats.articles}`);
  }
  console.log('─'.repeat(70));
  console.log(`${'TOTAL'.padEnd(8)} ${''.padEnd(45)} ${String(chapters.length).padEnd(6)} ${totalArticles}`);

  // ── 3i: Validation ───────────────────────────────────────────────
  let warnings = 0;

  if (sectionNums.size < 20) {
    console.warn(`⚠️  WARNING: Only ${sectionNums.size} sections found (expected ≥ 20)`);
    warnings++;
  }
  if (chapters.length < 80) {
    console.warn(`⚠️  WARNING: Only ${chapters.length} chapters found (expected ≥ 80)`);
    warnings++;
  }
  if (totalArticles < 750) {
    console.warn(`⚠️  WARNING: Only ${totalArticles} articles found (expected ≥ 750)`);
    warnings++;
  }

  const emptyChapters = chapters.filter((c) => c.articles.length === 0);
  if (emptyChapters.length > 0) {
    console.warn(`⚠️  WARNING: ${emptyChapters.length} chapters have 0 articles:`);
    for (const c of emptyChapters) {
      console.warn(`   - Глава ${c.chapter_number}: ${c.chapter_title}`);
    }
    warnings++;
  }

  const emptyArticles = chapters.flatMap((c) =>
    c.articles.filter((a) => !a.body.trim()).map((a) => `Статья ${a.number} (Глава ${c.chapter_number})`)
  );
  if (emptyArticles.length > 0) {
    console.warn(`⚠️  WARNING: ${emptyArticles.length} articles have empty bodies:`);
    for (const name of emptyArticles.slice(0, 10)) {
      console.warn(`   - ${name}`);
    }
    if (emptyArticles.length > 10) {
      console.warn(`   ... and ${emptyArticles.length - 10} more`);
    }
    warnings++;
  }

  if (warnings > 0) {
    console.log('');
    console.log(`⚠️  ${warnings} validation warning(s). Review output above.`);
    process.exit(2);
  }

  console.log('');
  console.log(`✅ Done. Wrote ${chapters.length} files across ${sectionNums.size} sections.`);
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
