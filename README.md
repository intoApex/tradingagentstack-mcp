# TradingAgentStack MCP Server

[![TradingAgentStack MCP connector](https://glama.ai/mcp/connectors/io.github.intoApex/tradingagentstack/badges/score.svg)](https://glama.ai/mcp/connectors/io.github.intoApex/tradingagentstack)
[![Listed on mcpservers.org](https://mcpservers.org/badge.svg)](https://mcpservers.org/servers/intoapex/tradingagentstack-mcp)

**Know what an AI trading tool can do with your money before you connect it.**

A free, read-only [Model Context Protocol](https://modelcontextprotocol.io) server for [TradingAgentStack](https://tradingagentstack.com). It returns the [verified AI trading leaderboard](https://tradingagentstack.com/ai-trading-leaderboard/) (results computed from public chain and venue data, never screenshots), Agent Risk Scores, incident records, a TAS Check verdict for a bot, exchange, swap service, or wallet link, and the sourced directory of over 140 AI trading tools: broker MCP servers, market data APIs and MCPs, agent frameworks, backtesters, trading bots, prediction market APIs, and VPS hosts.

Every answer includes the vendor's source URLs and the date the fact was last checked.

- **Endpoint (streamable HTTP):** `https://tradingagentstack.com/api/mcp`
- **Auth:** none. Free, no sign-in, read-only, no write access to anything.
- **Docs:** https://tradingagentstack.com/mcp/

## Tools

Checked against `tools/list` on the hosted endpoint (server version 0.6.0) on 2026-10-29. The same ten tools, with the same descriptions and inputs, are in the published npm package `tradingagentstack-mcp@0.6.0` and in this repository's `src/`.

| Tool | What it does |
|---|---|
| `search_tools(query, category?, can_trade_live?, has_paper?, limit?)` | Search by name, market, or feature. 10 results by default, up to 20 |
| `get_tool(slug)` | Every fact for one tool, with sources and safety inputs |
| `list_category(category)` | All tools in a category. An unknown category returns the category list |
| `compare_tools(slug_a, slug_b)` | Side-by-side comparison |
| `broker_order_gating()` | Who places the order for every broker MCP server (you, or the AI) |
| `get_risk(tool?, category?)` | Agent Risk Score for one tool, or a ranking for a category. Each input has a source. Missing inputs are listed, not guessed |
| `get_incidents(since?, tool?)` | Security incidents from official disclosures, filtered by date (`YYYY-MM-DD`) or by a listed tool or tracked bot, exchange or wallet |
| `check(query)` | TAS Check: whether a name, link, @handle, or GitHub repo is official, a known fake, or a lookalike, plus custody, freeze, API-key risk, privacy facts, incidents, and a short safe setup. Unknown is not safe |
| `check_setup(items)` | One report for up to 8 wallets, bots, exchanges or connectors: keys, worst case, who places orders, score, recent incidents and first fix for each, plus the biggest risk |
| `get_leaderboard(section?, limit?)` | The verified AI trading leaderboard: registered AI agents, AI-labelled and large Hyperliquid vaults (return, BTC over the same dates, max drawdown, Sortino, with the security gate), plus sections `apps` (AI trading apps on Hyperliquid), `models` (AI model benchmarks), `signals` (venue-reported robot signals) and `usage` (bot usage and repo health) |

## npm package and this repository

The recommended way to run the server locally is the published npm package:

```bash
npx -y tradingagentstack-mcp
```

That command installs the current npm release, `0.6.0`. Its binary is `tradingagentstack-mcp` (`src/index.js`). This repository holds the same source: `npm install` and `node src/index.js` start the same ten-tool stdio server. Releases are published to npm and the official MCP Registry from TradingAgentStack's main repository by GitHub Actions, and this repository is kept in step.

The local server reads the live dataset at https://tradingagentstack.com/data/tools.json. If that fetch fails, the npm package falls back to the copy bundled when it was published (`data/tools.json`, which isn't committed here). The one difference from the hosted endpoint: hosted `tools/list` gives each tool a title and marks it read-only, non-destructive, idempotent, and closed-world (`openWorldHint: false`), while the npm stdio server sets `readOnlyHint: true` and `openWorldHint: true`.

## Install

Run the published npm package, or connect to the hosted endpoint. Both are the current ten-tool server.

Node.js 18 or later is required for the npm package. The hosted endpoint needs no install and no API key.

An agent can follow [`llms-install.md`](llms-install.md) on its own.

### Cline

No API key. Add one server named `tradingagentstack`. The settings file is `~/.cline/data/settings/cline_mcp_settings.json` (Windows: `%USERPROFILE%\.cline\data\settings\cline_mcp_settings.json`), unless `CLINE_MCP_SETTINGS_PATH` is set. In the Cline panel, open it from the MCP Servers icon, then Configure, then Configure MCP Servers. Step-by-step instructions for an agent are in [`llms-install.md`](llms-install.md).

Published npm package (recommended local run):

```json
{
  "mcpServers": {
    "tradingagentstack": {
      "command": "npx",
      "args": ["-y", "tradingagentstack-mcp"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

```bash
cline mcp add tradingagentstack --yes -- npx -y tradingagentstack-mcp
```

Hosted endpoint. `"type": "streamableHttp"` is required. A URL with no type is legacy SSE, and this endpoint is streamable HTTP.

```json
{
  "mcpServers": {
    "tradingagentstack": {
      "type": "streamableHttp",
      "url": "https://tradingagentstack.com/api/mcp",
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

```bash
cline mcp add tradingagentstack https://tradingagentstack.com/api/mcp --transport http --yes
```

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
- "Which AI trading agents and AI-run vaults actually made money? Use get_leaderboard."
- "Check my setup: Phantom, Trojan, Binance and the Alpaca MCP server."

## Data

The hosted server and the npm package read the open dataset at https://tradingagentstack.com/data/ (JSON and CSV, CC BY 4.0). The current size is `meta.count` in `tools.json`. Also available for LLMs: [`llms.txt`](https://tradingagentstack.com/llms.txt) and [`llms-full.txt`](https://tradingagentstack.com/llms-full.txt).

Missing a tool or spotted an outdated fact? [Submit it](https://tradingagentstack.com/submit/) or open an issue.

## Run from source

```bash
npm install
node src/index.js    # the same ten-tool stdio server as the npm package
```

It fetches https://tradingagentstack.com/data/tools.json. Set `TAS_DATA_URL` to point it at another copy of the dataset. `node scripts/copy-data.js` saves a local copy to `data/tools.json`, which the server uses when the live fetch fails.

## Disclaimer

Not financial advice. Verify every fact with the vendor before connecting any tool to a funded account.
