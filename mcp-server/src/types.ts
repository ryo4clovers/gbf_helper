export interface CharacterFrontmatter {
  id: string;
  name_jp: string;
  name_en: string;
  rarity: "SSR" | "SR" | "R";
  element: "火" | "水" | "土" | "風" | "光" | "闇";
  race?: string;
  gender?: string;
  job_type?: string;
  obtain?: string;
  has_ex_ability: boolean;
  release_date?: string;
  status: "未着手" | "下書き" | "検証済み";
  last_updated: string;
  source: string;
}

export interface MechanicsFrontmatter {
  status: "未着手" | "下書き" | "検証済み";
  last_updated: string;
  source: string;
}

export interface KnowledgeDoc<TFrontmatter> {
  id: string;
  filePath: string;
  frontmatter: TFrontmatter;
  title: string;
  body: string;
  sections: Record<string, string>;
}

export type CharacterDoc = KnowledgeDoc<CharacterFrontmatter>;
export type MechanicsDoc = KnowledgeDoc<MechanicsFrontmatter>;
