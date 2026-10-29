// TradingAgentStack MCP core: dependency-free, read-only. Shared by the npm package (stdio) and the hosted endpoint (/api/mcp).
import { matchCheck } from "./checkmatch.js";
import { setupReport, MAX_ITEMS } from "./setupreport.js";
export const DATA_URL = "https://tradingagentstack.com/data/tools.json";
export const DISCLAIMER = "Not financial advice. Verify with the vendor.";
// What each tool returns. Neutral facts only: no instructions about when to call a tool.
export const INSTRUCTIONS = "Read-only directory of AI trading tools, broker connectors, risk ratings and incident records. "
  + "search_tools returns matching directory entries for a text query. "
  + "get_tool returns the facts, sources and scores for one tool. "
  + "list_category returns the tools in one category, or the category list if that slug is not a category. "
  + "compare_tools returns a field-by-field comparison of two tools. "
  + "broker_order_gating returns who places the order for each official broker MCP server. "
  + "get_risk returns the Agent Risk Score for one tool, or a ranking for one category. "
  + "get_incidents returns security incidents taken from official disclosures, for a listed tool or a tracked bot, exchange or wallet. "
  + "get_leaderboard returns verified performance (return, BTC benchmark, max drawdown, Sortino) computed from public venue data for AI-labelled and large Hyperliquid vaults and registered AI agents, with the security gate; also AI trading apps on Hyperliquid, AI model benchmarks, venue-reported robot signals and bot usage stats. "
  + "check returns whether a name, link or handle is official, listed, a known fake, a lookalike or unknown, plus the stored custody, privacy and incident facts for a tracked service. "
  + "check_setup returns one report for a list of bots, exchanges, wallets and connectors: keys, worst case, order approval, score, recent incidents and first fix for each, the biggest risk, and a shareable report link. "
  + DISCLAIMER;
export const VERSION = "0.6.0";
let cache = null, cachedAt = 0;
export async function loadData(fallback) {
  if (cache && Date.now() - cachedAt < 10 * 60 * 1000) return cache;
  try {
    const r = await fetch((typeof process !== "undefined" && process.env.TAS_DATA_URL) || DATA_URL, { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "tradingagentstack-mcp/" + VERSION } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    cache = await r.json(); cachedAt = Date.now(); return cache;
  } catch (e) {
    if (fallback) { const d = await fallback(); if (d) { cache = d; cachedAt = Date.now(); return d; } }
    throw new Error("Could not load " + DATA_URL + ": " + e.message);
  }
}
const str = { type: "string" }, bool = { type: "boolean" };
// Display titles. Every tool only reads TradingAgentStack's own published dataset, so all are read-only,
// non-destructive, idempotent and closed-world (annotations required by the Claude and ChatGPT app directories).
const TITLES = { search_tools: "Search AI trading tools", get_tool: "Get tool facts and sources", list_category: "List tools in a category",
  compare_tools: "Compare two tools", broker_order_gating: "Broker MCP order approval overview",
  get_risk: "Agent Risk Score for a tool", get_incidents: "Agent security incidents", check: "Check a bot, exchange or wallet before connecting", check_setup: "Check my whole setup", get_leaderboard: "Verified AI trading leaderboard" };
export const TOOLS = [
  { name: "search_tools", description: "Search the TradingAgentStack directory of AI trading tools (broker MCP servers, trading and data APIs, bots, frameworks) by name, market or feature. Optional filters: category slug, can_trade_live, has_paper.",
    inputSchema: { type: "object", properties: { query: { ...str, description: "Words to match, e.g. 'options paper alpaca'" }, category: { ...str, description: "Category slug, e.g. broker_mcp, data_api, ai_bot_platform" }, can_trade_live: { ...bool, description: "Only tools that can place real-money orders" }, has_paper: { ...bool, description: "Only tools with a documented paper/demo/testnet mode" }, limit: { type: "integer", minimum: 1, maximum: 20, description: "Max results (default 10)" } }, required: ["query"] } },
  { name: "get_tool", description: "Full facts for one tool: pricing, live vs paper, order approval, rate limits, safety score inputs and every source URL.",
    inputSchema: { type: "object", properties: { slug: { ...str, description: "Tool slug (from search_tools) or name" } }, required: ["slug"] } },
  { name: "list_category", description: "List every tool in a category. Call with an unknown category to get the list of categories.",
    inputSchema: { type: "object", properties: { category: { ...str, description: "Category slug, e.g. broker_mcp" } }, required: ["category"] } },
  { name: "compare_tools", description: "Compare two tools side by side, field by field, with sources.",
    inputSchema: { type: "object", properties: { slug_a: str, slug_b: str }, required: ["slug_a", "slug_b"] } },
  { name: "broker_order_gating", description: "Who places the order for every official broker MCP server: AI trades directly, you confirm each order, approval optional, or you place the order.",
    inputSchema: { type: "object", properties: {} } },
  { name: "get_risk", description: "Check a tool before your agent connects to it: how much money could the agent lose if it is wrong, hacked or prompt-injected? Returns the Agent Risk Score (custody, limits enforced outside the model, human approval, withdrawal scope, preview, open source, incident record), each input with its official source; missing inputs are listed, not guessed. Omit tool to rank every scored tool in a category (agent_wallet, agent_payments, ai_trading_agent, agent_token, bot_exchange, defi_agent).",
    inputSchema: { type: "object", properties: { tool: { ...str, description: "Tool slug or name, e.g. 'safe-smart-account', 'Hyperliquid'" }, category: { ...str, description: "Rank a category instead: agent_wallet, agent_payments, ai_trading_agent, agent_token, bot_exchange or defi_agent" } } } },
  { name: "get_incidents", description: "Security incidents involving AI agents, trading tools and the infrastructure they run on (breaches, exploits, security releases), each from an official disclosure. Filter by date, or by a listed tool or a bot, exchange or wallet tracked by check.",
    inputSchema: { type: "object", properties: { since: { ...str, description: "Only incidents on or after this date, YYYY-MM-DD" }, tool: { ...str, description: "Only incidents for this tool or service (slug or name), e.g. 'alpaca-mcp-server', 'Keystone', 'Bloom'" } } } },
  { name: "check", description: "Check before connecting (TAS Check): give a name, link, Telegram or X @handle, GitHub repo or app-store link of a Telegram trading bot, web trading terminal, exchange, swap service or wallet (incl. Zcash/Monero wallets). Returns whether the link is on that service's official list (confirmed from two independent places), a known fake, or a lookalike that uses its name, plus the worst case for your money, who holds the keys, freeze/hold policy, what a leaked API key can do, Monero/Zcash support, what the service collects about you and any data breaches, incidents, deadlines and a 3-step safe setup, each with sources. Unknown links are reported as unknown, never as safe.",
    inputSchema: { type: "object", properties: { query: { ...str, description: "e.g. 't.me/solana_trojanbot', 'bananagun.io', '@krakenfx', 'github.com/cake-tech/cake_wallet', 'Kraken'" } }, required: ["query"] } },
  { name: "check_setup", description: `Check a whole setup at once: up to ${MAX_ITEMS} bots, exchanges, wallets, swap services or AI trading connectors someone uses (names, links, @handles or slugs). For each: who holds the keys, the worst case, who places orders, the Agent Risk Score or safety score, incidents in the last 12 months and the first fix, each from the dataset. Also returns the single biggest risk by a fixed rule, items we don't track (reported as unknown, never as safe), and a report_url that opens the same report on tradingagentstack.com. Links that use a tracked name but aren't official are flagged.`,
    inputSchema: { type: "object", properties: { items: { type: "array", items: str, maxItems: MAX_ITEMS, description: "e.g. ['Phantom', 'Trojan', 'Binance', 'Alpaca MCP server']" } }, required: ["items"] } },
  { name: "get_leaderboard", description: "Verified performance leaderboard for AI trading agents, bots and vaults: return, BTC over the same dates, max drawdown and Sortino ratio, computed by TradingAgentStack from the venue's public API (never screenshots, self-reported PnL or backtests), with security rated separately as a gate. Sections: ai_vaults (Hyperliquid vaults whose leader says they are AI-run, with the quoted claim), vaults (biggest Hyperliquid vaults of any strategy), agents (AI agents with an officially published trading account or on-chain registration), apps (AI trading apps on Hyperliquid: users, volume and users' realized PnL from public builder fills), models (which AI model forecasts and trades best: ForecastBench, Prophet Arena, Alpha Arena, FutureEval), signals (grade B: MQL5 robot signals on real accounts, venue-reported, not ranked), usage (fees users pay Telegram bots, trading apps and AI agent protocols, and open-source repo health). Ranked vaults passed a 30% drawdown gate and are sorted by Sortino; the rest are listed as high_drawdown. Not investment advice.",
    inputSchema: { type: "object", properties: { section: { type: "string", enum: ["all", "ai_vaults", "vaults", "agents", "apps", "models", "signals", "usage"], description: "Which list to return (default all: the verified lists plus apps; models, signals and usage only when asked)" }, limit: { type: "integer", minimum: 1, maximum: 50, description: "Max entries per list (default 10)" } } } },
];
// Paid setup pointer: only in get_tool, only for broker, bot and prediction-market categories.
export const SETUP_HELP = { url: "https://tradingagentstack.com/custom-agents/", note: "Paid setup service offered by the site owner" };
export const SETUP_HELP_CATS = new Set(["broker_mcp", "broker_api", "ai_bot_platform", "bot_exchange", "open_source_bot", "prediction_market"]);
// Our own open-source limits tool, offered only where an agent can trade without a per-order confirmation.
// It never changes any fact or score; it's a separate, clearly labelled field.
export const GUARD_PROFILES = new Set(["alpaca-mcp-server", "ccxt-mcp-server"]);
const GUARD_WHO = new Set(["AI trades directly", "Approval optional"]);
export function limitsTool(t) {
  if (t.category !== "broker_mcp" || !GUARD_WHO.has(t.who_places_order)) return null;
  return { name: "TAS Guard", url: "https://tradingagentstack.com/guard/", install: "npx tas-guard",
    what: "Free open-source proxy you put in front of this connector: per-order and daily limits, symbol allow list, human approval (including from a phone), kill switch, audit log.",
    profile: GUARD_PROFILES.has(t.slug) ? `https://tradingagentstack.com/data/profiles/${t.slug}.json` : "none yet (runs in heuristic mode)",
    note: "Made by the site owner. It does not affect safety scores or rankings." };
}
const slugify = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const MONEY_CATS_NO = new Set(["data_mcp", "data_api", "agent_framework", "ai_signals", "bot_vps", "risk_tool", "trading_agent", "security_tool"]);
const canLive = (t) => !MONEY_CATS_NO.has(t.category) && t.safety_level !== "Can't place real-money orders";
const hasPaper = (t) => (t.safety_inputs && t.safety_inputs.paper > 0 && canLive(t)) || /paper|demo|sandbox|testnet|dry.?run/i.test(t.live_vs_paper || "");
const clipText = (x, n = 220) => (typeof x === "string" && x.length > n ? x.slice(0, n).replace(/\s+\S*$/, "") + "… (full text: get_tool)" : x);
const brief = (t) => ({ slug: t.slug, name: t.name, category: t.category_label, live_vs_paper: clipText(t.live_vs_paper), safety: `${t.safety_pct}%${t.safety_partial ? " (partial)" : ""}`, page: t.page, source: t.source, last_checked: t.last_checked });
const sourcesOf = (ts) => [...new Set(ts.flatMap((t) => [t.source, ...Object.values(t.safety_sources || {})]).filter(Boolean))];
function find(tools, q) { const s = slugify(q); return tools.find((t) => t.slug === s) || tools.find((t) => slugify(t.name) === s) || tools.find((t) => t.slug.startsWith(s)) || tools.find((t) => t.slug.includes(s)); }
function wrap(result, ts, meta) {
  const dates = ts.map((t) => t.last_checked).filter(Boolean).sort();
  return { result, sources: sourcesOf(ts), last_checked: dates.length ? dates[dates.length - 1] : meta.generated, dataset: meta.url, license: meta.license + " (" + meta.attribution + ")", disclaimer: DISCLAIMER };
}
export const RISK_METHOD = "https://tradingagentstack.com/methodology/#agent-risk-score";
const riskPct = (r) => (r.max ? Math.round((100 * r.score) / r.max) : null);
function riskOf(t) {
  const r = t.risk_v2;
  return { tool: t.name, slug: t.slug, category: t.category_label, agent_risk_score: `${riskPct(r)}%${r.partial ? " (partial)" : ""}`, points: `${r.score} / ${r.max}`, partial: r.partial,
    missing_inputs: r.missing, inputs: r.inputs, incidents: t.incidents || [], page: t.page + "#agent-risk-score", method: RISK_METHOD,
    reading: "Higher means less money at risk if the agent is wrong, hacked or prompt-injected. Missing inputs lower the maximum instead of counting as zero." };
}
const riskSources = (t) => Object.values((t.risk_v2 || {}).inputs || {}).map((i) => i.source).filter(Boolean);
export async function callTool(name, args = {}, fallback) {
  const d = await loadData(fallback); const tools = d.tools, meta = d.meta;
  switch (name) {
    case "search_tools": {
      if (typeof args.query !== "string" || !args.query.trim()) throw new Error("query is required: words to match, for example 'options paper alpaca'.");
      const terms = args.query.toLowerCase().split(/\s+/).filter(Boolean);
      let r = tools.filter((t) => (!args.category || t.category === args.category) && (args.can_trade_live === undefined || canLive(t) === args.can_trade_live) && (args.has_paper === undefined || hasPaper(t) === args.has_paper));
      r = r.map((t) => { const hay = JSON.stringify([t.name, t.category_label, t.assets_covered, t.live_vs_paper, t.order_approval_safety, t.pricing_free_tier, t.former_names]).toLowerCase(); const nm = t.name.toLowerCase(); return [t, terms.reduce((s, w) => s + (nm.includes(w) ? 3 : 0) + (hay.includes(w) ? 1 : 0), 0)]; })
        .filter(([, s]) => !terms.length || s > 0).sort((a, b) => b[1] - a[1] || a[0].name.localeCompare(b[0].name)).slice(0, Math.max(1, Math.min(20, Number(args.limit) || 10))).map(([t]) => t);
      return wrap({ count: r.length, tools: r.map(brief) }, r, meta);
    }
    case "get_tool": {
      const t = find(tools, args.slug); if (!t) throw new Error(`No tool matches '${args.slug}'. Use search_tools first.`);
      const r = SETUP_HELP_CATS.has(t.category) ? { ...t, setup_help: SETUP_HELP } : { ...t };
      const lt = limitsTool(t); if (lt) r.add_limits = lt;
      return wrap(r, [t], meta);
    }
    case "list_category": {
      const cats = [...new Map(tools.map((t) => [t.category, t.category_label])).entries()].map(([slug, label]) => ({ slug, label, count: tools.filter((t) => t.category === slug).length }));
      const r = tools.filter((t) => t.category === args.category);
      if (!r.length) return wrap({ error: `Unknown category '${args.category}'.`, categories: cats }, [], meta);
      return wrap({ category: args.category, count: r.length, tools: r.map(brief) }, r, meta);
    }
    case "compare_tools": {
      const a = find(tools, args.slug_a), b = find(tools, args.slug_b);
      if (!a || !b) throw new Error(`No tool matches '${!a ? args.slug_a : args.slug_b}'. Use search_tools first.`);
      const F = ["category_label", "assets_covered", "live_vs_paper", "order_approval_safety", "who_places_order", "pricing_free_tier", "rate_limits", "official_or_community", "safety_pct", "safety_partial", "safety_missing_inputs", "safety_inputs", "source", "last_checked"];
      return wrap({ fields: Object.fromEntries(F.map((f) => [f, { [a.slug]: a[f] ?? "unknown", [b.slug]: b[f] ?? "unknown" }])), pages: [a.page, b.page] }, [a, b], meta);
    }
    case "broker_order_gating": {
      const bm = tools.filter((t) => t.category === "broker_mcp"); const groups = {};
      for (const t of bm) (groups[t.who_places_order || "unknown"] ||= []).push({ name: t.name, slug: t.slug, note: t.order_gating_note, safety: `${t.safety_pct}%${t.safety_partial ? " (partial)" : ""}`, page: t.page, source: (t.safety_sources || {}).unattended || t.source, last_checked: t.last_checked });
      const lt = { name: "TAS Guard", url: "https://tradingagentstack.com/guard/", install: "npx tas-guard", applies_to: bm.filter((t) => limitsTool(t)).map((t) => t.slug),
        what: "Free open-source proxy that adds per-order and daily limits, human approval and a kill switch in front of connectors where the AI trades directly or approval is optional.",
        note: "Made by the site owner. It does not affect safety scores or rankings." };
      return wrap({ total: bm.length, groups, research: "https://tradingagentstack.com/research/broker-mcp-order-gating/", add_limits: lt }, bm, meta);
    }
    case "get_risk": {
      if (!args.tool) {
        const cat = args.category; const scored = tools.filter((t) => t.risk_v2);
        const cats = [...new Set(scored.map((t) => t.category))];
        if (!cat || !cats.includes(cat)) return wrap({ error: cat ? `No Agent Risk Scores in '${cat}'.` : "Pass a tool, or a category to rank.", categories_with_scores: cats, method: RISK_METHOD }, [], meta);
        const r = scored.filter((t) => t.category === cat).sort((a, b) => riskPct(b.risk_v2) - riskPct(a.risk_v2));
        return { ...wrap({ category: cat, count: r.length, ranking: r.map((t) => ({ tool: t.name, slug: t.slug, agent_risk_score: `${riskPct(t.risk_v2)}%${t.risk_v2.partial ? " (partial)" : ""}`, missing_inputs: t.risk_v2.missing, page: t.page + "#agent-risk-score" })), method: RISK_METHOD }, r, meta), sources: [...new Set(r.flatMap(riskSources))] };
      }
      const t = find(tools, args.tool); if (!t) throw new Error(`No tool matches '${args.tool}'. Use search_tools first.`);
      if (!t.risk_v2) {
        return wrap({ tool: t.name, slug: t.slug, category: t.category_label, agent_risk_score: null,
          note: "No Agent Risk Score yet: it covers crypto agent tools (agent wallets, exchanges for bots, on-chain and DeFi agents). This tool's general safety score is below.",
          safety_score: `${t.safety_pct}%${t.safety_partial ? " (partial)" : ""}`, safety_level: t.safety_level, safety_inputs: t.safety_inputs, safety_missing_inputs: t.safety_missing_inputs, incidents: t.incidents || [], page: t.page, method: "https://tradingagentstack.com/safety-score/" }, [t], meta);
      }
      return { ...wrap(riskOf(t), [t], meta), sources: [...new Set([...riskSources(t), t.source])] };
    }
    case "get_incidents": {
      let inc = d.incidents || [];
      if (args.since) { if (!/^\d{4}-\d{2}-\d{2}$/.test(args.since)) throw new Error("since must be YYYY-MM-DD"); inc = inc.filter((i) => i.date >= args.since); }
      let svc = null;
      if (args.tool) {
        const s = slugify(args.tool), E = d.checks || [];
        // A bot, exchange or wallet tracked by check (exact slug or name) wins over a partial tool-name match.
        const ce = E.find((e) => e.slug === s || slugify(e.name) === s) || null;
        let t = find(tools, args.tool); if (t && ce && t.slug !== s && slugify(t.name) !== s) t = null;
        if (!t && !ce) throw new Error(`No tool or tracked service matches '${args.tool}'. Use search_tools, or check with its name or link.`);
        const own = ce ? (ce.incidents || []).filter((i) => !args.since || i.date >= args.since).map((i) => ({ ...i, tools: [ce.name], check_page: `https://tradingagentstack.com/check/${ce.slug}/` })) : [];
        const seen = new Set(own.map((i) => i.date + "|" + i.source));
        inc = [...own, ...(t ? inc.filter((i) => (i.tools || []).includes(t.name) && !seen.has(i.date + "|" + i.source)) : [])];
        svc = ce ? ce.name : t.name;
      }
      inc = [...inc].sort((a, b) => (a.date < b.date ? 1 : -1));
      return { result: { ...(svc ? { service: svc } : {}), count: inc.length, incidents: inc, tracker: "https://tradingagentstack.com/incidents/", rule: "Only incidents with an official source: the vendor's disclosure, a security advisory, or a named researcher's report marked as such." },
        sources: [...new Set(inc.map((i) => i.source).filter(Boolean))], last_checked: meta.generated, dataset: meta.url, license: meta.license + " (" + meta.attribution + ")", disclaimer: DISCLAIMER };
    }
    case "check": {
      const E = d.checks || [];
      if (!String(args.query || "").trim()) throw new Error("Pass query: a name, link, @handle or GitHub repo.");
      const m = matchCheck(String(args.query).slice(0, 300), E);
      const e = m.entry ? E.find((x) => x.slug === m.entry) : null;
      const TEXT = { official: "On the official list for this service (confirmed from two independent places). Official is not the same as risk-free: read worst_case.",
        listed: "Listed for this service, but not confirmed from two independent places. Double-check before connecting.",
        known_fake: "A reputable source flagged this exact link as a fake. Do not connect, sign or enter keys.",
        lookalike: "NOT an official link: it uses a tracked service's name or is a near-miss of its official domain. Treat it as a likely drainer.",
        name: "Matched by name. Compare any link you were given against official.",
        unknown: "Not tracked by TAS Check. Unknown does not mean safe." };
      const card = e && { name: e.name, kind: e.kind, page: `https://tradingagentstack.com/check/${e.slug}/`, status: e.status || null, worst_case: e.worst_case, custody: e.custody, can_move_funds_out: e.can_move_funds_out,
        freeze_policy: e.freeze_policy, api_keys: e.api_keys, privacy_coins: e.privacy_coins, official: e.official, links_status: e.links_status, known_fakes: e.known_fakes,
        privacy: e.privacy || null, incidents: (e.incidents || []).slice(0, 5), deadlines: e.deadlines, safe_setup: e.safe_setup, last_checked: e.last_checked };
      const srcs = e ? [e.custody, e.can_move_funds_out, e.freeze_policy, e.api_keys, e.privacy_coins, ...(e.incidents || []), ...(e.deadlines || []), ...((e.privacy || {}).breaches || [])].map((x) => x && x.source).filter(Boolean).concat((e.privacy || {}).sources || []) : [];
      return { result: { verdict: m.verdict, meaning: TEXT[m.verdict] || "", matched: m.matched || null, reason: m.reason || null, fake_source: m.source || null, also: m.also || [], service: card,
          tracked: E.length, method: "https://tradingagentstack.com/check/#method" },
        sources: [...new Set(srcs.flatMap((s) => String(s).split(/\s*;\s*|\s+/)).filter((s) => s.startsWith("http")))], last_checked: e ? e.last_checked : meta.generated, dataset: meta.url, license: meta.license + " (" + meta.attribution + ")", disclaimer: DISCLAIMER };
    }
    case "check_setup": {
      const r = setupReport(args.items, d, matchCheck);
      const srcs = r.items.flatMap((x) => [x.keys_source, x.latest_incident && x.latest_incident.source]).filter(Boolean).flatMap((s) => String(s).split(/\s*;\s*|\s+/)).filter((s) => s.startsWith("http"));
      return { result: { ...r, method: "https://tradingagentstack.com/setup/#method" }, sources: [...new Set(srcs)], last_checked: meta.generated, dataset: meta.url, license: meta.license + " (" + meta.attribution + ")", disclaimer: DISCLAIMER };
    }
    case "get_leaderboard": {
      const lb = d.leaderboard, page = "https://tradingagentstack.com/ai-trading-leaderboard/";
      const base = { last_checked: meta.generated, dataset: meta.url, license: meta.license + " (" + meta.attribution + ")", disclaimer: DISCLAIMER };
      const sec = args.section || "all";
      if (!["all", "ai_vaults", "vaults", "agents", "apps", "models", "signals", "usage"].includes(sec)) throw new Error("section must be all, ai_vaults, vaults, agents, apps, models, signals or usage.");
      if (!lb) return { result: { status: "The leaderboard is not in this dataset yet.", page }, sources: [page], ...base };
      const lim = Math.max(1, Math.min(50, Number(args.limit) || 10));
      const cut = (s) => (s && Array.isArray(s.ranked) ? { ...s, ranked: s.ranked.slice(0, lim), high_drawdown: (s.high_drawdown || []).slice(0, lim), shown: `up to ${lim} per list` } : s);
      const out = { principle: lb.principle, security_gate: lb.security_gate, performance_rules: lb.performance_rules,
        units: "return, btc_return, max_drawdown and return_30d are fractions (0.245 = +24.5%); tvl_usd in US dollars", page: lb.page || page, method: lb.method };
      if (sec === "all" || sec === "ai_vaults") out.ai_labelled_vaults = cut(lb.ai_labelled_vaults);
      if (sec === "all" || sec === "vaults") out.hyperliquid_vaults = cut(lb.hyperliquid_vaults);
      if (sec === "all" || sec === "agents") out.ai_agents_with_public_accounts = lb.ai_agents_with_public_accounts;
      const top = (a) => (Array.isArray(a) ? a.slice(0, lim) : a);
      if ((sec === "all" || sec === "apps") && lb.ai_apps_hyperliquid) out.ai_apps_hyperliquid = { ...lb.ai_apps_hyperliquid, apps: top(lb.ai_apps_hyperliquid.apps), units: "volume_usd and realized_pnl_usd in US dollars over the window; share_users_profitable is a fraction" };
      if (sec === "models" && lb.model_benchmarks) out.model_benchmarks = { ...lb.model_benchmarks, forecastbench_top: top(lb.model_benchmarks.forecastbench_top), prophet_arena_top: top(lb.model_benchmarks.prophet_arena_top) };
      if (sec === "signals" && lb.robot_signals_grade_b) out.robot_signals_grade_b = { ...lb.robot_signals_grade_b, signals: top(lb.robot_signals_grade_b.signals), grade: "B: reported by the venue (MQL5) from the real account, not computed by TradingAgentStack; shown, not ranked" };
      if (sec === "usage" && lb.usage) out.usage = { ...lb.usage, defillama: lb.usage.defillama && Object.fromEntries(Object.entries(lb.usage.defillama).map(([k, v]) => [k, top(v)])), repo_health: top(lb.usage.repo_health) };
      if (["apps", "models", "signals", "usage"].includes(sec) && Object.keys(out).length === 6) out.status = "This section is not in this dataset yet.";
      const asof = [(lb.ai_labelled_vaults || {}).as_of, (lb.hyperliquid_vaults || {}).as_of].filter(Boolean).sort();
      return { result: out, sources: [...new Set([out.page, "https://api.hyperliquid.xyz/info", (lb.hyperliquid_vaults || {}).data, (lb.ai_labelled_vaults || {}).data,
        out.ai_apps_hyperliquid && out.ai_apps_hyperliquid.data, out.model_benchmarks && "https://www.forecastbench.org/leaderboards/", out.model_benchmarks && "https://www.prophetarena.co/leaderboard/forecast",
        out.robot_signals_grade_b && "https://www.mql5.com/en/signals", out.usage && "https://defillama.com", out.usage && out.usage.page].filter(Boolean))],
        ...base, last_checked: asof.length ? asof[asof.length - 1] : meta.generated, disclaimer: lb.disclaimer || DISCLAIMER };
    }
    default: throw new Error("Unknown tool: " + name);
  }
}
// Minimal JSON-RPC handler (used by the hosted endpoint; stateless streamable HTTP, JSON responses).
export async function handleRpc(msg, fallback) {
  const { id, method, params = {} } = msg;
  const ok = (result) => ({ jsonrpc: "2.0", id, result });
  if (id === undefined || id === null) return null; // notification
  try {
    if (method === "initialize") return ok({ protocolVersion: ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"].includes(params.protocolVersion) ? params.protocolVersion : "2025-06-18", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "tradingagentstack", version: VERSION }, instructions: INSTRUCTIONS });
    if (method === "ping") return ok({});
    if (method === "tools/list") return ok({ tools: TOOLS.map((t) => ({ ...t, title: TITLES[t.name], annotations: { title: TITLES[t.name], readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } })) });
    if (method === "tools/call") {
      try { const r = await callTool(params.name, params.arguments || {}, fallback); return ok({ content: [{ type: "text", text: JSON.stringify(r, null, 1) }], structuredContent: r }); }
      catch (e) { return ok({ content: [{ type: "text", text: e.message + " " + DISCLAIMER }], isError: true }); }
    }
    return { jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found: " + method } };
  } catch (e) { return { jsonrpc: "2.0", id, error: { code: -32603, message: e.message } }; }
}
