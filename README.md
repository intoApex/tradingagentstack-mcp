# TradingAgentStack MCP Server

[![TradingAgentStack MCP connector](https://glama.ai/mcp/connectors/io.github.intoApex/tradingagentstack/badges/score.svg)](https://glama.ai/mcp/connectors/io.github.intoApex/tradingagentstack)

**Know what an AI trading tool can do with your money before you connect it.**

A free, read-only [Model Context Protocol](https://modelcontextprotocol.io) server for the [TradingAgentStack](https://tradingagentstack.com) directory of over 140 AI trading tools, including broker MCP servers, market data APIs and MCPs, agent frameworks, backtesters, trading bots, prediction market APIs, and VPS hosts. It also returns Agent Risk Scores, incident records, and a TAS Check verdict for a bot, exchange, swap service, or wallet link.

Every answer includes the vendor's source URLs and the date the fact was last checked.

- **Endpoint (streamable HTTP):** `https://tradingagentstack.com/api/mcp`
- **Auth:** none. Free, no sign-in, read-only, no write access to anything.
- **Docs:** https://tradingagentstack.com/mcp/

## Tools

Checked against `tools/list` on the hosted endpoint (server version 0.5.0) on 2026-10-27. The same eight tools, with the same descriptions and inputs, are in the published npm package `tradingagentstack-mcp@0.5.0`.

| Tool | What it does |
|---|---|
| `search_tools(query, category?, can_trade_live?, has_paper?)` | Search by name, market, or feature |
| `get_tool(slug)` | Every fact for one tool, with sources and safety inputs |
| `list_category(category)` | All tools in a category. An unknown category returns the category list |
| `compare_tools(slug_a, slug_b)` | Side-by-side comparison |
| `broker_order_gating()` | Who places the order for every broker MCP server (you, or the AI) |
| `get_risk(tool?, category?)` | Agent Risk Score for one tool, or a ranking for a category. Each input has a source. Missing inputs are listed, not guessed |
| `get_incidents(since?, tool?)` | Security incidents from official disclosures, filtered by date (`YYYY-MM-DD`) or tool |
| `check(query)` | TAS Check: whether a name, link, @handle, or GitHub repo is official, a known fake, or a lookalike, plus custody, freeze, API-key risk, incidents, and a short safe setup. Unknown is not safe |

## npm package and this repository

`npx -y tradingagentstack-mcp` runs the current npm release. That release is `0.5.0`, and its binary is `tradingagentstack-mcp` (`src/index.js`). It is published from [intoApex/ai-trading-tools](https://github.com/intoApex/ai-trading-tools) (`mcp-server`). Its tool list matches the hosted endpoint.

Three differences remain between that package and the hosted server:

- The hosted server tells the client to call `get_risk` before connecting an agent to a wallet, exchange, or trading tool. The npm stdio server introduces itself as a read-only directory of AI trading tools.
- Hosted `tools/list` gives each tool a title and marks it read-only, non-destructive, idempotent, and closed-world (`openWorldHint: false`). The npm stdio server sets `readOnlyHint: true` and `openWorldHint: true`.
- If the live dataset fetch fails, the npm package serves a copy bundled in `0.5.0` (133 tools, generated 2026-10-23). On 2026-10-27 the live file https://tradingagentstack.com/data/tools.json reported `meta.count` 143 (generated 2026-10-26). The site homepage lists the same live total.

This repository is still version 0.3.2. `npm run build` and `node dist/index.js` start that older stdio server. It implements only `search_tools`, `get_tool`, `list_category`, `compare_tools`, and `broker_order_gating`. It has no bundled dataset.

## Install

Node.js 18 or later is required for the npm package. The hosted endpoint needs no install.

### Gemini CLI

`gemini-extension.json` starts the published package with `npx -y tradingagentstack-mcp`. `GEMINI.md` is the context file Gemini CLI loads with the extension.

```bash
gemini extensions install https://github.com/intoApex/tradingagentstack-mcp
```

Restart Gemini CLI after installing.

The [extension gallery](https://geminicli.com/extensions/) lists a public GitHub repository after it has the topic `gemini-cli-extension` and a `gemini-extension.json` file at the repository root. The crawler runs daily. Add the topic in the repository About settings.

### Claude Code

Hosted endpoint:

```bash
claude mcp add --transport http tradingagentstack https://tradingagentstack.com/api/mcp
```

Project config (`.mcp.json` in this repo). Claude Code asks you to approve it the first time:

```json
{
  "mcpServers": {
    "tradingagentstack": {
      "type": "http",
      "url": "https://tradingagentstack.com/api/mcp"
    }
  }
}
```

Published npm package:

```bash
claude mcp add tradingagentstack -- npx -y tradingagentstack-mcp
```

**Claude Desktop / claude.ai:** Settings → Connectors → Add custom connector → paste `https://tradingagentstack.com/api/mcp`

**Claude Desktop (local, via npm):** add this to `claude_desktop_config.json` (Settings → Developer → Edit Config), then restart Claude Desktop.

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

### Cursor

Hosted endpoint, in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "tradingagentstack": { "url": "https://tradingagentstack.com/api/mcp" }
  }
}
```

Published npm package, in `.cursor/mcp.json`:

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

### Hosted endpoint

Any client that supports remote MCP over streamable HTTP:

`https://tradingagentstack.com/api/mcp`

No API key and no sign-in.

## Example prompts

- "Which broker MCP servers let the AI place live orders without my confirmation?"
- "Compare Alpaca MCP and IBKR MCP for paper trading."
- "Find free market data APIs that cover crypto and US stocks."
- "What safeguards does the Robinhood Trading MCP have?"
- "Before I connect this wallet, call get_risk and tell me what it could lose."
- "Is this Telegram bot link official, or a lookalike?"

## Data

The hosted server and the npm package read the open dataset at https://tradingagentstack.com/data/ (JSON and CSV, CC BY 4.0). The current size is `meta.count` in `tools.json`. Also available for LLMs: [`llms.txt`](https://tradingagentstack.com/llms.txt) and [`llms-full.txt`](https://tradingagentstack.com/llms-full.txt).

Missing a tool or spotted an outdated fact? [Submit it](https://tradingagentstack.com/submit/) or open an issue.

## Build from source

```bash
npm install
npm run build
node dist/index.js   # stdio server from this repo (0.3.2, five tools)
```

That local server fetches https://tradingagentstack.com/data/tools.json and caches it in memory for one hour. Set `TAS_DATA_URL` to point it at another copy of the dataset. It does not include `get_risk`, `get_incidents`, or `check`. For those, use the hosted endpoint or `npx -y tradingagentstack-mcp`.

## Disclaimer

Not financial advice. Verify every fact with the vendor before connecting any tool to a funded account.
