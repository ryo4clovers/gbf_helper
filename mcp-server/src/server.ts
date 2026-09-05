import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { KNOWLEDGE_BASE_PATH } from "./constants.js";
import { registerCalculatorTools } from "./tools/calculator.js";
import { registerCharacterTools } from "./tools/characters.js";
import { registerMechanicsTools } from "./tools/mechanics.js";
import { registerSummonTools } from "./tools/summons.js";

export function createGbfMcpServer(knowledgeBasePath = KNOWLEDGE_BASE_PATH): McpServer {
  const server = new McpServer({
    name: "gbf-knowledge-mcp-server",
    version: "0.1.0",
  });
  registerCharacterTools(server, knowledgeBasePath);
  registerMechanicsTools(server, knowledgeBasePath);
  registerSummonTools(server, knowledgeBasePath);
  registerCalculatorTools(server);
  return server;
}
