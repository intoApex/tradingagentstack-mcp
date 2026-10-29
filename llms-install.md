# TradingAgentStack MCP: install steps

Use this file alone. It is enough to connect Cline to the current server.

The server is free and read-only. It needs no API key, no sign-in, no header, and no environment variable.

Pick one connection. Add only one entry named `tradingagentstack`.

## 1. Published npm package

Recommended when a local process is fine.

```bash
npx -y tradingagentstack-mcp
```

- Package: `tradingagentstack-mcp` on npm.
- Source: this repository (`src/index.js`), the same code as the published package.
- Binary name: `tradingagentstack-mcp`.
- Needs Node.js 18 or later, plus network access to the npm registry and to https://tradingagentstack.com/data/tools.json.
- Last checked 2026-10-29: npm version `0.6.0`.

## 2. Hosted endpoint

Recommended when you want no local process and no Node.js install.

```text
https://tradingagentstack.com/api/mcp
```

- Transport: streamable HTTP.
- Auth: none.
- Same ten tools as the published package.

## Tools to expect

`search_tools`, `get_tool`, `list_category`, `compare_tools`, `broker_order_gating`, `get_risk`, `get_incidents`, `check`, `check_setup`, `get_leaderboard`.

A server that lists only five or eight of these tools is an old version. Switch it to the npm command or the hosted URL above.

## Cline: npm package

1. Run `node -v`. The version must be 18 or newer. If `node` or `npx` is missing, use the hosted endpoint in the next section.
2. Run `npm view tradingagentstack-mcp version`. A version string means the package is reachable. On 2026-10-29 that version was `0.6.0`.
3. Open the MCP settings file:
   - If `CLINE_MCP_SETTINGS_PATH` is set, edit that path.
   - Otherwise edit `~/.cline/data/settings/cline_mcp_settings.json`.
   - On Windows that path is `%USERPROFILE%\.cline\data\settings\cline_mcp_settings.json`.
   - Create the `settings` directory and the file when they are missing.
4. If the file is missing or empty, write this document:

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

5. If the file already has servers, keep every other entry. Add or replace only the `tradingagentstack` key with the object above. The file stays valid JSON with a top-level `mcpServers` object. Add no `env`, no `headers`, and no API key.
6. In the Cline panel, the same file opens from the MCP Servers icon, then Configure, then Configure MCP Servers.
7. When the `cline` command is available, this writes the same stdio entry:

```bash
cline mcp add tradingagentstack --yes -- npx -y tradingagentstack-mcp
```

8. Reload MCP servers in Cline. Success: `tradingagentstack` is enabled and lists the ten tools named above. The first start can take longer while `npx` downloads the package. Retry once if that start times out.

`npx -y tradingagentstack-mcp` speaks MCP on stdin and waits. A quiet waiting process is a successful manual start. Stop that process after a manual test so the terminal is free. Cline starts its own process from the settings file.

## Cline: hosted endpoint

1. Open the same settings file as in the npm section.
2. If the file is missing or empty, write this document:

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

3. If the file already has servers, keep every other entry. Add or replace only `tradingagentstack` with that object. Include `"type": "streamableHttp"`. Cline treats a URL with no `type` as legacy SSE, and this endpoint is streamable HTTP. Add no Authorization header.
4. In the Cline panel, Remote Servers accepts the same endpoint: name `tradingagentstack`, URL `https://tradingagentstack.com/api/mcp`, transport Streamable HTTP.
5. When the `cline` command is available:

```bash
cline mcp add tradingagentstack https://tradingagentstack.com/api/mcp --transport http --yes
```

6. Check the endpoint before reloading Cline:

```bash
curl -sS -X POST https://tradingagentstack.com/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\",\"params\":{}}"
```

Success is HTTP 200 and a JSON body whose `result.tools` names are the ten tools listed above.

7. Reload MCP servers in Cline. Success: `tradingagentstack` is enabled and lists those ten tools.

## Other clients

The same two commands apply.

- Published package: command `npx`, args `["-y", "tradingagentstack-mcp"]`.
- Hosted endpoint: `https://tradingagentstack.com/api/mcp` over streamable HTTP.

## Troubleshooting

- `npx` is missing: install Node.js 18 or later, or use the hosted URL.
- The tool list has five or eight names: the config starts an old version (for example `node dist/index.js` from an old checkout of this repository). Point it at `npx -y tradingagentstack-mcp` or at `https://tradingagentstack.com/api/mcp`.
- The hosted server fails at connect: the entry includes `"type": "streamableHttp"`.
- The first npm start times out: wait for the package download and reload the server once.
- Set `TAS_DATA_URL` only when the user supplies another copy of the dataset. The default URL is https://tradingagentstack.com/data/tools.json.

Not financial advice. Verify every fact with the vendor before connecting a tool to a funded account.
