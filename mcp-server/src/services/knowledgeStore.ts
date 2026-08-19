import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type {
  CharacterDoc,
  CharacterFrontmatter,
  MechanicsDoc,
  MechanicsFrontmatter,
  SummonDoc,
  SummonFrontmatter,
} from "../types.js";

const CHARACTERS_DIR = "characters";
const MECHANICS_DIR = "mechanics";
const SUMMONS_DIR = "summons";

async function listMarkdownFiles(dirPath: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(dirPath);
  } catch {
    return [];
  }
  return entries
    .filter((name) => name.endsWith(".md") && !name.startsWith("_") && name !== "README.md")
    .map((name) => path.join(dirPath, name));
}

function splitIntoSections(body: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const matches = [...body.matchAll(headingRegex)];
  for (let i = 0; i < matches.length; i++) {
    const heading = matches[i][2].trim();
    const start = matches[i].index! + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : body.length;
    sections[heading] = body.slice(start, end).trim();
  }
  return sections;
}

function extractTitle(body: string): string {
  const match = body.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

async function parseCharacterFile(filePath: string): Promise<CharacterDoc> {
  const raw = await fs.readFile(filePath, "utf-8");
  const { data, content } = matter(raw);
  const id = path.basename(filePath, ".md");
  return {
    id,
    filePath,
    frontmatter: data as CharacterFrontmatter,
    title: extractTitle(content),
    body: content,
    sections: splitIntoSections(content),
  };
}

async function parseSummonFile(filePath: string): Promise<SummonDoc> {
  const raw = await fs.readFile(filePath, "utf-8");
  const { data, content } = matter(raw);
  const id = path.basename(filePath, ".md");
  return {
    id,
    filePath,
    frontmatter: data as SummonFrontmatter,
    title: extractTitle(content),
    body: content,
    sections: splitIntoSections(content),
  };
}

// mechanics/_template.md has no YAML frontmatter; status/last_updated/source live
// as "> ラベル: 値" blockquote lines directly under the H1 heading instead.
const BLOCKQUOTE_PATTERNS = {
  status: /^>\s*ステータス:\s*(.+)$/m,
  last_updated: /^>\s*最終更新:\s*(.+)$/m,
  source: /^>\s*出典:\s*(.+)$/m,
} as const;

async function parseMechanicsFile(filePath: string): Promise<MechanicsDoc> {
  const raw = await fs.readFile(filePath, "utf-8");
  const id = path.basename(filePath, ".md");
  const statusMatch = raw.match(BLOCKQUOTE_PATTERNS.status);
  const lastUpdatedMatch = raw.match(BLOCKQUOTE_PATTERNS.last_updated);
  const sourceMatch = raw.match(BLOCKQUOTE_PATTERNS.source);
  const frontmatter: MechanicsFrontmatter = {
    status: (statusMatch?.[1].trim() as MechanicsFrontmatter["status"]) ?? "未着手",
    last_updated: lastUpdatedMatch?.[1].trim() ?? "",
    source: sourceMatch?.[1].trim() ?? "要検証",
  };
  return {
    id,
    filePath,
    frontmatter,
    title: extractTitle(raw),
    body: raw,
    sections: splitIntoSections(raw),
  };
}

export async function loadCharacters(knowledgeBasePath: string): Promise<CharacterDoc[]> {
  const files = await listMarkdownFiles(path.join(knowledgeBasePath, CHARACTERS_DIR));
  return Promise.all(files.map(parseCharacterFile));
}

export async function loadMechanicsTopics(knowledgeBasePath: string): Promise<MechanicsDoc[]> {
  const files = await listMarkdownFiles(path.join(knowledgeBasePath, MECHANICS_DIR));
  return Promise.all(files.map(parseMechanicsFile));
}

export async function loadSummons(knowledgeBasePath: string): Promise<SummonDoc[]> {
  const files = await listMarkdownFiles(path.join(knowledgeBasePath, SUMMONS_DIR));
  return Promise.all(files.map(parseSummonFile));
}

export async function findCharacterById(
  knowledgeBasePath: string,
  id: string,
): Promise<CharacterDoc | null> {
  const characters = await loadCharacters(knowledgeBasePath);
  return characters.find((c) => c.id === id) ?? null;
}

export async function findMechanicsTopicById(
  knowledgeBasePath: string,
  id: string,
): Promise<MechanicsDoc | null> {
  const topics = await loadMechanicsTopics(knowledgeBasePath);
  return topics.find((t) => t.id === id) ?? null;
}

export async function findSummonById(
  knowledgeBasePath: string,
  id: string,
): Promise<SummonDoc | null> {
  const summons = await loadSummons(knowledgeBasePath);
  return summons.find((s) => s.id === id) ?? null;
}
