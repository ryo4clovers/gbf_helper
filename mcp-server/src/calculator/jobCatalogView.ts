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
  verificationStatus: "検証済み" | "下書き" | "未着手";
}

export interface SelectableJobCatalog {
  schemaVersion: 1;
  jobs: SelectableJobCatalogEntry[];
}

/** Creates a browser-safe job catalog from the existing Markdown knowledge. */
export function createSelectableJobCatalog(
  knowledgeBasePath = KNOWLEDGE_BASE_PATH,
): SelectableJobCatalog {
  const jobsPath = path.join(knowledgeBasePath, "jobs");
  const jobs = readdirSync(jobsPath)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_") && name !== "README.md")
    .map((name): SelectableJobCatalogEntry => {
      const frontmatter = jobFrontmatterSchema.parse(
        matter(readFileSync(path.join(jobsPath, name), "utf8")).data,
      );
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
        verificationStatus: frontmatter.status,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "ja"));
  return { schemaVersion: 1, jobs };
}
