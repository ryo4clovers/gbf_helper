import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { KNOWLEDGE_BASE_PATH } from "./constants.js";
import { createGbfMcpServer } from "./server.js";

const server = createGbfMcpServer(KNOWLEDGE_BASE_PATH);

const transport = new StdioServerTransport();
await server.connect(transport);

// stdout is reserved for the JSON-RPC protocol; log only to stderr.
console.error(`gbf-knowledge-mcp-server running via stdio (knowledge base: ${KNOWLEDGE_BASE_PATH})`);
