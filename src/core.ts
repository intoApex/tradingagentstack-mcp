// TradingAgentStack MCP core: read-only. Mirrors the hosted endpoint (https://tradingagentstack.com/api/mcp).
export const DATA_URL = "https://tradingagentstack.com/data/tools.json";
export const DISCLAIMER = "Not financial advice. Verify with the vendor.";
export const VERSION = "0.3.2";
const CACHE_MS = 60 * 60 * 1000; // 1 hour

type Json = any; // dataset rows are open-ended JSON objects
export interface Dataset { meta: Json; tools: Json[] }

// Defensive: never pass affiliate / referral data to clients, even if the dataset ever adds it.
const AFFILIATE_KEY = /affiliate|referral|ref_?link|ref_?code|commission|sponsor|partner_?link|tracking|^go_|_go$|go_url/i;
function clean(v: Json): Json {
  if (Array.isArray(v)) return v.map(clean);
  if (v && typeof v === "object") {
    const o: Json = {};
    for (const [k, x] of Object.entries(v)) if (!AFFILIATE_KEY.test(k)) o[k] = clean(x);
    return o;
  }
  return v;
}

let cache: Dataset | null = null, cachedAt = 0;
export async function loadData(): Promise<Dataset> {
  if (cache && Date.now() - cachedAt < CACHE_MS) return cache;
  try {
    const r = await fetch(process.env.TAS_DATA_URL || DATA_URL, { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "tradingagentstack-mcp/" + VERSION } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const d = clean(await r.json()) as Dataset;
    if (!d || !Array.isArray(d.tools)) throw new Error("unexpected dataset format");
    cache = d; cachedAt = Date.now(); return d;
  } catch (e) {
    if (cache) return cache; // serve stale data rather than fail
    throw new Error("Could not load " + DATA_URL + ": " + (e as Error).message);
  }
}

const str = { type: "string" }, bool = { type: "boolean" };
export const TOOLS = [
  { name: "search_tools", description: "Search the TradingAgentStack directory of AI trading tools (broker MCP servers, trading and data APIs, bots, frameworks) by name, market or feature. Optional filters: category slug, can_trade_live, has_paper.",
    inputSchema: { type: "object", properties: { query: { ...str, description: "Words to match, e.g. 'options paper alpaca'" }, category: { ...str, description: "Category slug, e.g. broker_mcp, data_api, ai_bot_platform" }, can_trade_live: { ...bool, description: "Only tools that can place real-money orders" }, has_paper: { ...bool, description: "Only tools with a documented paper/demo/testnet mode" } }, required: ["query"] } },
  { name: "get_tool", description: "Full facts for one tool: pricing, live vs paper, order approval, rate limits, safety score inputs and every source URL.",
    inputSchema: { type: "object", properties: { slug: { ...str, description: "Tool slug (from search_tools) or name" } }, required: ["slug"] } },
  { name: "list_category", description: "List every tool in a category. Call with an unknown category to get the list of categories.",
    inputSchema: { type: "object", properties: { category: { ...str, description: "Category slug, e.g. broker_mcp" } }, required: ["category"] } },
  { name: "compare_tools", description: "Compare two tools side by side, field by field, with sources.",
    inputSchema: { type: "object", properties: { slug_a: str, slug_b: str }, required: ["slug_a", "slug_b"] } },
  { name: "broker_order_gating", description: "Who places the order for every official broker MCP server: AI trades directly, you confirm each order, approval optional, or you place the order.",
    inputSchema: { type: "object", properties: {} } },
];

// Paid setup pointer: only in get_tool, only for broker, bot and prediction-market categories (matches /api/mcp).
export const SETUP_HELP = { url: "https://tradingagentstack.com/custom-agents/", note: "Paid setup service offered by the site owner" };
export const SETUP_HELP_CATS = new Set(["broker_mcp", "broker_api", "ai_bot_platform", "bot_exchange", "open_source_bot", "prediction_market"]);
// Our own open-source limits tool, offered only where an agent can trade without a per-order confirmation (matches /api/mcp).
// It never changes any fact or score; it's a separate, clearly labelled field.
export const GUARD_PROFILES = new Set(["alpaca-mcp-server", "ccxt-mcp-server"]);
const GUARD_WHO = new Set(["AI trades directly", "Approval optional"]);
export function limitsTool(t: Json): Json | null {
  if (t.category !== "broker_mcp" || !GUARD_WHO.has(t.who_places_order)) return null;
  return { name: "TAS Guard", url: "https://tradingagentstack.com/guard/", install: "npx tas-guard",
    what: "Free open-source proxy you put in front of this connector: per-order and daily limits, symbol allow list, human approval (including from a phone), kill switch, audit log.",
    profile: GUARD_PROFILES.has(t.slug) ? `https://tradingagentstack.com/data/profiles/${t.slug}.json` : "none yet (runs in heuristic mode)",
    note: "Made by the site owner. It does not affect safety scores or rankings." };
}
const slugify = (s: unknown) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const MONEY_CATS_NO = new Set(["data_mcp", "data_api", "agent_framework", "ai_signals", "bot_vps", "risk_tool", "trading_agent", "security_tool"]);
const canLive = (t: Json) => !MONEY_CATS_NO.has(t.category) && t.safety_level !== "Can't place real-money orders";
const hasPaper = (t: Json) => (t.safety_inputs && t.safety_inputs.paper > 0 && canLive(t)) || /paper|demo|sandbox|testnet|dry.?run/i.test(t.live_vs_paper || "");
const pct = (t: Json) => `${t.safety_pct}%${t.safety_partial ? " (partial)" : ""}`;
const brief = (t: Json) => ({ slug: t.slug, name: t.name, category: t.category_label, live_vs_paper: t.live_vs_paper, safety: pct(t), page: t.page, source: t.source, last_checked: t.last_checked });
const sourcesOf = (ts: Json[]) => [...new Set(ts.flatMap((t) => [t.source, ...Object.values(t.safety_sources || {})]).filter(Boolean))];
function find(tools: Json[], q: unknown) { const s = slugify(q); return tools.find((t) => t.slug === s) || tools.find((t) => slugify(t.name) === s) || tools.find((t) => t.slug.startsWith(s)) || tools.find((t) => t.slug.includes(s)); }
function wrap(result: Json, ts: Json[], meta: Json) {
  const dates = ts.map((t) => t.last_checked).filter(Boolean).sort();
  return { result, sources: sourcesOf(ts), last_checked: dates.length ? dates[dates.length - 1] : meta.generated, dataset: meta.url, license: meta.license + " (" + meta.attribution + ")", disclaimer: DISCLAIMER };
}

export async function callTool(name: string, args: Json = {}) {
  const d = await loadData(); const tools = d.tools, meta = d.meta;
  switch (name) {
    case "search_tools": {
      const terms = String(args.query || "").toLowerCase().split(/\s+/).filter(Boolean);
      const r = tools.filter((t) => (!args.category || t.category === args.category) && (args.can_trade_live === undefined || canLive(t) === args.can_trade_live) && (args.has_paper === undefined || hasPaper(t) === args.has_paper))
        .map((t): [Json, number] => { const hay = JSON.stringify([t.name, t.category_label, t.assets_covered, t.live_vs_paper, t.order_approval_safety, t.pricing_free_tier, t.former_names]).toLowerCase(); const nm = t.name.toLowerCase(); return [t, terms.reduce((s, w) => s + (nm.includes(w) ? 3 : 0) + (hay.includes(w) ? 1 : 0), 0)]; })
        .filter(([, s]) => !terms.length || s > 0).sort((a, b) => b[1] - a[1] || a[0].name.localeCompare(b[0].name)).slice(0, 20).map(([t]) => t);
      return wrap({ count: r.length, tools: r.map(brief) }, r, meta);
    }
    case "get_tool": {
      const t = find(tools, args.slug); if (!t) throw new Error(`No tool matches '${args.slug}'. Use search_tools first.`);
      const r: Json = SETUP_HELP_CATS.has(t.category) ? { ...t, setup_help: SETUP_HELP } : { ...t };
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
      const bm = tools.filter((t) => t.category === "broker_mcp"); const groups: Record<string, Json[]> = {};
      for (const t of bm) (groups[t.who_places_order || "unknown"] ||= []).push({ name: t.name, slug: t.slug, note: t.order_gating_note, safety: pct(t), page: t.page, source: (t.safety_sources || {}).unattended || t.source, last_checked: t.last_checked });
      const lt = { name: "TAS Guard", url: "https://tradingagentstack.com/guard/", install: "npx tas-guard", applies_to: bm.filter((t) => limitsTool(t)).map((t) => t.slug),
        what: "Free open-source proxy that adds per-order and daily limits, human approval and a kill switch in front of connectors where the AI trades directly or approval is optional.",
        note: "Made by the site owner. It does not affect safety scores or rankings." };
      return wrap({ total: bm.length, groups, research: "https://tradingagentstack.com/research/broker-mcp-order-gating/", add_limits: lt }, bm, meta);
    }
    default: throw new Error("Unknown tool: " + name);
  }
}
