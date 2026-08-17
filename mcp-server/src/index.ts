import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { KNOWLEDGE_BASE_PATH } from "./constants.js";
import { registerCharacterTools } from "./tools/characters.js";
import { registerMechanicsTools } from "./tools/mechanics.js";

const server = new McpServer({
  name: "gbf-knowledge-mcp-server",
  version: "0.1.0",
});

registerCharacterTools(server, KNOWLEDGE_BASE_PATH);
registerMechanicsTools(server, KNOWLEDGE_BASE_PATH);

const transport = new StdioServerTransport();
await server.connect(transport);

// stdout is reserved for the JSON-RPC protocol; log only to stderr.
console.error(`gbf-knowledge-mcp-server running via stdio (knowledge base: ${KNOWLEDGE_BASE_PATH})`);
