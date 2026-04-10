# CLAUDE.md — Session Instructions

## Read this at the start of EVERY session.

### Rules
1. Work on `main` branch only. Do NOT create `claude/*` branches.
2. Run `npm run build` after every change. Fix all errors before pushing.
3. Never rewrite or restructure working files unless the user explicitly asks.
4. Ask the user before modifying any file you didn't create in this session.
5. One feature at a time. Verify before moving on.
6. Never run `git reset --hard` or force push without explicit user confirmation.
7. Push directly to `main` after each completed step.

### Project context
- KZ Tax Advisor: AI consultant for Kazakhstan tax law (Налоговый кодекс РК 2026)
- Users: business owners and accountants managing multiple companies under different tax regimes (mostly упрощённый режим)
- Core idea: companies have profiles → AI knows their regime → AI advises, calculates, reminds about tax deadlines
- Tax code lives in `/tax-code/` as structured markdown files, loaded contextually per query

### Stack
Next.js 15 App Router, TypeScript, Tailwind, Vercel Postgres, Anthropic SDK, JWT auth.

### Tax code loading strategy
- `/tax-code/раздел-NN-<slug>/глава-NN-<slug>.md` — tax code split by chapter, one file per глава
- `lib/tax-code-loader.ts` — keyword-based section retriever (walks directories recursively)
- AI endpoint loads only relevant sections into system prompt per request (NOT full code every time)

## Tax code parser

- Source PDF: `/tax-code/_source/nk-rk-2026.pdf` (not committed unless user adds it)
- Parser script: `scripts/parse-tax-code.ts`
- Run: `npm run parse-tax-code`
- Output: `/tax-code/раздел-NN-<slug>/глава-NN-<slug>.md` files with frontmatter
- Idempotent — safe to re-run; deletes and recreates `раздел-*` folders
- Loader (`lib/tax-code-loader.ts`) reads all files recursively
