import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { KNOWLEDGE_BASE_PATH } from "../constants.js";

const jobFrontmatterSchema = z
  .object({
    job_id: z.union([z.string(), z.number()]).transform(String),
    name_jp: z.string().min(1),
    name_en: z.string().min(1),
    class_tier: z.string().min(1),
    weapon_type: z.string().min(1),
    status: z.enum(["検証済み", "下書き", "未着手"]),
  })
  .passthrough();

const weaponKindCodes: Record<string, string> = {
  剣: "1",
  短剣: "2",
  槍: "3",
  斧: "4",
  杖: "5",
  銃: "6",
  格闘: "7",
  弓: "8",
  楽器: "9",
  刀: "10",
};

export interface SelectableJobCatalogEntry {
  jobId: string;
  name: string;
  nameEn: string;
  classTier: string;
  weaponKinds: Array<{ code: string; name: string }>;
  baseDoubleAttackRate?: number;
  baseTripleAttackRate?: number;
  jobLevelMultiattackBonuses: MultiattackRateBonus[];
  masterLevelMultiattackBonuses: MultiattackRateBonus[];
  perfectionProofMultiattackBonuses: MultiattackRateBonus[];
  verificationStatus: "検証済み" | "下書き" | "未着手";
}

export interface MultiattackRateBonus {
  level: number;
  doubleAttackRatePercent: number;
  tripleAttackRatePercent: number;
}

export interface SelectableJobCatalog {
  schemaVersion: 1;
  jobs: SelectableJobCatalogEntry[];
}

function section(markdown: string, headingPrefix: string): string {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith(`## ${headingPrefix}`));
  if (start < 0) return "";
  const endOffset = lines.slice(start + 1).findIndex((line) => line.startsWith("## "));
  const end = endOffset < 0 ? lines.length : start + 1 + endOffset;
  return lines.slice(start + 1, end).join("\n");
}

function rateInText(text: string, label: "ダブルアタック" | "トリプルアタック"): number {
  const match = text.match(new RegExp(`${label}(?:確率|率)?\\s*\\+?\\s*(\\d+(?:\\.\\d+)?)\\s*[%％]`));
  return match === null ? 0 : Number(match[1]);
}

function multiattackBonusRows(markdownSection: string): MultiattackRateBonus[] {
  return [...markdownSection.matchAll(/^\|\s*(\d+)\s*\|\s*(.*?)\s*\|\s*$/gm)]
    .map((match) => ({
      level: Number(match[1]),
      doubleAttackRatePercent: rateInText(match[2], "ダブルアタック"),
      tripleAttackRatePercent: rateInText(match[2], "トリプルアタック"),
    }))
    .filter((bonus) => bonus.doubleAttackRatePercent > 0 || bonus.tripleAttackRatePercent > 0);
}

function baseMultiattackRates(markdown: string): { double?: number; triple?: number } {
  const match = markdown.match(
    /^\|\s*DA基礎率\/TA基礎率\s*\|\s*(\d+(?:\.\d+)?)\s*[%％]\s*\/\s*(\d+(?:\.\d+)?)\s*[%％]/m,
  );
  return match === null ? {} : { double: Number(match[1]), triple: Number(match[2]) };
}

/** Creates a browser-safe job catalog from the existing Markdown knowledge. */
export function createSelectableJobCatalog(
  knowledgeBasePath = KNOWLEDGE_BASE_PATH,
): SelectableJobCatalog {
  const jobsPath = path.join(knowledgeBasePath, "jobs");
  const jobs = readdirSync(jobsPath)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_") && name !== "README.md")
    .map((name): SelectableJobCatalogEntry => {
      const document = matter(readFileSync(path.join(jobsPath, name), "utf8"));
      const frontmatter = jobFrontmatterSchema.parse(document.data);
      const baseRates = baseMultiattackRates(document.content);
      const weaponKinds = frontmatter.weapon_type.split("/").map((weaponName) => {
        const normalizedName = weaponName.trim();
        const code = weaponKindCodes[normalizedName];
        if (code === undefined) throw new Error(`unknown job weapon type: ${normalizedName}`);
        return { code, name: normalizedName };
      });
      return {
        jobId: frontmatter.job_id,
        name: frontmatter.name_jp,
        nameEn: frontmatter.name_en,
        classTier: frontmatter.class_tier,
        weaponKinds,
        baseDoubleAttackRate: baseRates.double,
        baseTripleAttackRate: baseRates.triple,
        jobLevelMultiattackBonuses: multiattackBonusRows(section(document.content, "ジョブLvアップボーナス")),
        masterLevelMultiattackBonuses: multiattackBonusRows(section(document.content, "マスターレベル強化")),
        perfectionProofMultiattackBonuses: multiattackBonusRows(section(document.content, "極致の証")),
        verificationStatus: frontmatter.status,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "ja"));
  return { schemaVersion: 1, jobs };
}
