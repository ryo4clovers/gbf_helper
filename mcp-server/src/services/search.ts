import type { CharacterFrontmatter, KnowledgeDoc } from "../types.js";

export interface ScoredMatch<T> {
  doc: T;
  score: number;
  matchedIn: string[];
  snippet: string;
}

interface SearchOptions {
  limit: number;
  offset: number;
}

const SNIPPET_RADIUS = 60;

function buildSnippet(text: string, query: string): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, SNIPPET_RADIUS * 2).trim();
  const start = Math.max(0, idx - SNIPPET_RADIUS);
  const end = Math.min(text.length, idx + query.length + SNIPPET_RADIUS);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

/**
 * Plain keyword/substring scoring over frontmatter name fields, section headings,
 * and body text. No embeddings — the corpus is small enough that this is sufficient;
 * if it grows large, swap the internals here for a vector search behind the same signature.
 */
export function searchDocs<T extends KnowledgeDoc<unknown>>(
  docs: T[],
  query: string,
  opts: SearchOptions,
): { results: ScoredMatch<T>[]; total: number } {
  const q = query.trim().toLowerCase();
  const scored: ScoredMatch<T>[] = [];

  for (const doc of docs) {
    let score = 0;
    const matchedIn: string[] = [];
    let snippetSource = "";

    const frontmatter = doc.frontmatter as Partial<CharacterFrontmatter>;
    const nameFields: Array<[string, string | undefined]> = [
      ["id", doc.id],
      ["name_jp", frontmatter.name_jp],
      ["name_en", frontmatter.name_en],
      ["title", doc.title],
    ];
    for (const [field, value] of nameFields) {
      if (!value) continue;
      const v = value.toLowerCase();
      if (v === q) {
        score += 100;
        matchedIn.push(field);
        snippetSource ||= value;
      } else if (v.includes(q)) {
        score += 50;
        matchedIn.push(field);
        snippetSource ||= value;
      }
    }

    for (const [heading, sectionBody] of Object.entries(doc.sections)) {
      const headingHit = heading.toLowerCase().includes(q);
      const bodyHit = sectionBody.toLowerCase().includes(q);
      if (headingHit) {
        score += 20;
        matchedIn.push(`セクション: ${heading}`);
        snippetSource ||= sectionBody;
      } else if (bodyHit) {
        score += 5;
        matchedIn.push(`セクション: ${heading}`);
        snippetSource ||= sectionBody;
      }
    }

    if (score === 0 && doc.body.toLowerCase().includes(q)) {
      score += 2;
      matchedIn.push("本文");
      snippetSource ||= doc.body;
    }

    if (score > 0) {
      scored.push({
        doc,
        score,
        matchedIn,
        snippet: buildSnippet(snippetSource || doc.body, query),
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const total = scored.length;
  const results = scored.slice(opts.offset, opts.offset + opts.limit);
  return { results, total };
}
