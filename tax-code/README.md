# Tax Code

Auto-generated from `/tax-code/_source/nk-rk-2026.pdf` by `scripts/parse-tax-code.ts`.

## Structure
- `раздел-NN-<slug>/` — one folder per РАЗДЕЛ (22 total)
- `раздел-NN-<slug>/глава-NN-<slug>.md` — one file per Глава (90 total)
- Each chapter file contains all its articles with frontmatter for search

## Regenerate
```bash
npm run parse-tax-code
```

## Do not edit generated files by hand
Any manual edits will be lost on the next parse. To change content, edit the PDF source or the parser.
