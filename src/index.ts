#!/usr/bin/env node
// tradingagentstack-mcp: read-only stdio MCP server for https://tradingagentstack.com
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { TOOLS, callTool, VERSION, DISCLAIMER } from "./core.js";

const server = new Server({ name: "tradingagentstack", version: VERSION }, { capabilities: { tools: {} }, instructions: "Read-only directory of AI trading tools. " + DISCLAIMER });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS.map((t) => ({ ...t, annotations: { readOnlyHint: true, openWorldHint: true } })) }));
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  try {
    const r = await callTool(req.params.name, req.params.arguments || {});
    return { content: [{ type: "text", text: JSON.stringify(r, null, 1) }], structuredContent: r };
  } catch (e) {
    return { content: [{ type: "text", text: (e as Error).message + " " + DISCLAIMER }], isError: true };
  }
});
await server.connect(new StdioServerTransport());
