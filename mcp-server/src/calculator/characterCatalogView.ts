import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { KNOWLEDGE_BASE_PATH } from "../constants.js";

const characterFrontmatterSchema = z
  .object({
    id: z.string().min(1),
    name_jp: z.string().min(1),
    name_en: z.string().min(1),
    rarity: z.enum(["SSR", "SR", "R"]),
    element: z.enum(["火", "水", "土", "風", "光", "闇"]),
    status: z.enum(["検証済み", "下書き", "未着手"]),
  })
  .passthrough();

const elementCodes: Record<string, string> = {
  火: "1",
  水: "2",
  土: "3",
  風: "4",
  光: "5",
  闇: "6",
};

export interface SelectableCharacterCatalogEntry {
  characterId: string;
  name: string;
  nameEn: string;
  elementCode: string;
  rarity: "SSR" | "SR" | "R";
  verificationStatus: "検証済み" | "下書き" | "未着手";
}

export interface SelectableCharacterCatalog {
  schemaVersion: 1;
  characters: SelectableCharacterCatalogEntry[];
}

/** Browser-safe character metadata. Character instance and account data are never included. */
export function createSelectableCharacterCatalog(
  knowledgeBasePath = KNOWLEDGE_BASE_PATH,
): SelectableCharacterCatalog {
  const charactersPath = path.join(knowledgeBasePath, "characters");
  const characters = readdirSync(charactersPath)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_") && name !== "README.md")
    .map((name): SelectableCharacterCatalogEntry => {
      const frontmatter = characterFrontmatterSchema.parse(
        matter(readFileSync(path.join(charactersPath, name), "utf8")).data,
      );
      return {
        characterId: frontmatter.id,
        name: frontmatter.name_jp,
        nameEn: frontmatter.name_en,
        elementCode: elementCodes[frontmatter.element],
        rarity: frontmatter.rarity,
        verificationStatus: frontmatter.status,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "ja"));
  return { schemaVersion: 1, characters };
}
