# TradingAgentStack MCP Server

[![TradingAgentStack MCP connector](https://glama.ai/mcp/connectors/io.github.intoApex/tradingagentstack/badges/score.svg)](https://glama.ai/mcp/connectors/io.github.intoApex/tradingagentstack)

**Know what an AI trading tool can do with your money before you connect it.**

A free, read-only [Model Context Protocol](https://modelcontextprotocol.io) server that lets Claude, ChatGPT, Cursor or your own agent query the [TradingAgentStack](https://tradingagentstack.com) directory: sourced facts on **114 AI trading tools**, including every official **broker MCP server**, market data APIs and MCPs, agent frameworks, backtesters, trading bots, prediction market APIs and VPS hosts.

Every answer includes the vendor's source URLs and the date the fact was last checked.

- **Endpoint (streamable HTTP):** `https://tradingagentstack.com/api/mcp`
- **Auth:** none. Free, no sign-in, read-only, no write access to anything.
- **Docs:** https://tradingagentstack.com/mcp/

## Tools

| Tool | What it does |
|---|---|
| `search_tools(query, category?, can_trade_live?, has_paper?)` | Search by name, market or feature |
| `get_tool(slug)` | Every fact for one tool, with sources and safety inputs |
| `list_category(category)` | All tools in a category |
| `compare_tools(slug_a, slug_b)` | Side-by-side comparison |
| `broker_order_gating()` | Who places the order for every broker MCP server (you, or the AI) |

## Install

**Claude Code**

```bash
claude mcp add --transport http tradingagentstack https://tradingagentstack.com/api/mcp
```

**Claude Desktop / claude.ai:** Settings → Connectors → Add custom connector → paste `https://tradingagentstack.com/api/mcp`

**Claude Desktop (local, via npm):** add this to `claude_desktop_config.json` (Settings → Developer → Edit Config), then restart Claude Desktop. Needs Node.js 18 or later.

```json
{
  "mcpServers": {
    "tradingagentstack": {
      "command": "npx",
      "args": ["-y", "tradingagentstack-mcp"]
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "tradingagentstack": { "url": "https://tradingagentstack.com/api/mcp" }
  }
}
```

**Any other client** that supports remote MCP over streamable HTTP: use `https://tradingagentstack.com/api/mcp`.

## Example prompts

- "Which broker MCP servers let the AI place live orders without my confirmation?"
- "Compare Alpaca MCP and IBKR MCP for paper trading."
- "Find free market data APIs that cover crypto and US stocks."
- "What safeguards does the Robinhood Trading MCP have?"

## Data

The server reads the open dataset published at https://tradingagentstack.com/data/ (JSON and CSV, CC BY 4.0). Also available for LLMs: [`llms.txt`](https://tradingagentstack.com/llms.txt) and [`llms-full.txt`](https://tradingagentstack.com/llms-full.txt).

Missing a tool or spotted an outdated fact? [Submit it](https://tradingagentstack.com/submit/) or open an issue.

## Build from source

```bash
npm install
npm run build
node dist/index.js   # stdio server
```

The local server fetches https://tradingagentstack.com/data/tools.json and caches it in memory for one hour. Set `TAS_DATA_URL` to point it at another copy of the dataset.

## Disclaimer

Not financial advice. Verify every fact with the vendor before connecting any tool to a funded account.
