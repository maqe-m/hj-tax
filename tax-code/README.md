# Tax Code Files — Налоговый кодекс РК

This directory contains the Kazakhstan tax code split by chapters/topics as structured markdown files.

## File Format

Each `.md` file represents one chapter or topic and must include YAML frontmatter:

```markdown
---
id: simplified-regime
title: Упрощённый режим налогообложения
keywords: [упрощёнка, упрощенка, упрощенный, simplified, СНР, малый бизнес, ИП, ТОО]
articles: [696, 697, 698]
---

# Section content here...
```

### Frontmatter fields:

- **id** (string, required) — unique section identifier
- **title** (string, required) — section title in Russian
- **keywords** (string[], required) — search keywords for the AI retriever (Russian + transliteration + English)
- **articles** (number[], optional) — article numbers from the tax code covered in this section

## How it works

1. The AI endpoint receives a user question
2. `lib/tax-code-loader.ts` searches these files by keywords and company context
3. Only the top 5 most relevant sections are loaded into the AI's system prompt
4. The AI answers based on the loaded sections + its general knowledge

## Adding content

1. Copy `_template.md` and name it descriptively (e.g., `03-vat.md`)
2. Fill in the frontmatter with relevant keywords
3. Paste the actual tax code text as the content
4. The system will automatically pick it up on next query
