#!/usr/bin/env node
// tradingagentstack-mcp: local stdio server. Reads https://tradingagentstack.com/data/tools.json (bundled copy as offline fallback).
import { readFileSync } from "node:fs";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { TOOLS, callTool, VERSION, DISCLAIMER, INSTRUCTIONS } from "./core.js";
const bundled = async () => { try { return JSON.parse(readFileSync(new URL("../data/tools.json", import.meta.url), "utf8")); } catch { return null; } };
const server = new Server({ name: "tradingagentstack", version: VERSION }, { capabilities: { tools: {} }, instructions: INSTRUCTIONS });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS.map((t) => ({ ...t, annotations: { readOnlyHint: true, openWorldHint: true } })) }));
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  try { const r = await callTool(req.params.name, req.params.arguments || {}, bundled); return { content: [{ type: "text", text: JSON.stringify(r, null, 1) }], structuredContent: r }; }
  catch (e) { return { content: [{ type: "text", text: e.message + " " + DISCLAIMER }], isError: true }; }
});
await server.connect(new StdioServerTransport());
