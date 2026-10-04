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
  masterId?: string;
  styleId?: number;
  imageUrl?: string;
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

export interface CharacterCatalogRecord {
  data: z.infer<typeof characterFrontmatterSchema>;
  content: string;
}
/** Read once per request; raw knowledge records stay server-side. */
export function readCharacterCatalogRecords(knowledgeBasePath = KNOWLEDGE_BASE_PATH): CharacterCatalogRecord[] {
  const charactersPath = path.join(knowledgeBasePath, "characters");
  return readdirSync(charactersPath)
    .filter(name => name.endsWith(".md") && !name.startsWith("_") && name !== "README.md")
    .map(name => {
      const parsed = matter(readFileSync(path.join(charactersPath, name), "utf8"));
      return { data: characterFrontmatterSchema.parse(parsed.data), content: parsed.content };
    });
}

/** Browser-safe character metadata. Character instance and account data are never included. */
export function createSelectableCharacterCatalog(
  knowledgeBasePath = KNOWLEDGE_BASE_PATH,
  records = readCharacterCatalogRecords(knowledgeBasePath),
): SelectableCharacterCatalog {
  const imageCatalog = z.object({ entries: z.record(z.object({
    masterId: z.string().regex(/^30[234]\d{7}$/), wikiPage: z.string(), styleId: z.literal(2).optional(),
  })) }).parse(JSON.parse(readFileSync(new URL("../../catalog/character-images.v1.json", import.meta.url), "utf8")));
  const characters = records.map(({ data: frontmatter }): SelectableCharacterCatalogEntry => {
      const image = imageCatalog.entries[frontmatter.id];
      return {
        characterId: frontmatter.id,
        ...(image ? {
          masterId: image.masterId,
          ...(image.styleId ? { styleId: image.styleId } : {}),
          imageUrl: `https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/assets/npc/m/${image.masterId}_01${image.styleId ? `_st${image.styleId}` : ""}.jpg`,
        } : {}),
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
