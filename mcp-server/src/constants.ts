import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// dist/constants.js -> mcp-server/dist -> ".." -> mcp-server -> ".." -> repo root -> knowledge
export const DEFAULT_KNOWLEDGE_PATH = path.resolve(__dirname, "..", "..", "knowledge");

export const KNOWLEDGE_BASE_PATH = process.env.GBF_KNOWLEDGE_PATH ?? DEFAULT_KNOWLEDGE_PATH;
