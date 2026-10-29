// Check my setup (2026-10-28): given the bots, exchanges, wallets and connectors someone uses, return one report:
// for each item who holds the keys, the worst case, who places orders, the score, recent incidents and the first fix,
// plus the single biggest risk. Shared by the MCP check_setup tool and the /setup/ page (copied to /assets/setupreport.js
// and site/api/_setupreport.js by build_setup.py). Pure function, no dependencies: it only reads the published dataset.
// Facts are passed through from the dataset; nothing here scores or rates anything new.
export const SETUP_BASE = "https://tradingagentstack.com/setup/";
export const MAX_ITEMS = 8;
const slugify = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const KEYS = { service: "The service holds your keys", user: "You hold the keys", exchange: "The exchange holds your funds", "shared/MPC": "Keys are shared (MPC)" };
const KIND = { telegram_bot: "Telegram trading bot", web_trading_terminal: "Web trading terminal", exchange: "Exchange", swap_service: "Swap service", privacy_wallet: "Privacy wallet", wallet: "Self-custody wallet" };
// Order of the "biggest risk" rule, most serious first. Ties go to the item listed first.
export const RISK_ORDER = [
  ["not_official", "This link is not on the service's official list"],
  ["active_incident", "The service has an open incident or warning"],
  ["service_holds_keys", "The service holds your keys, so a hack or exit can take your funds"],
  ["ai_trades_directly", "The AI can place orders without asking you"],
  ["no_limits", "No spending limits or destination allowlist outside the AI, so a wrong or hijacked agent can send funds anywhere"],
  ["recent_incident", "An incident in the last 12 months"],
  ["approval_optional", "Order approval is optional and can be switched off"],
];
const pct = (r) => (r && r.max ? Math.round((100 * r.score) / r.max) : null);
function findTool(tools, q) {
  const s = slugify(q); if (!s) return null;
  return tools.find((t) => t.slug === s) || tools.find((t) => slugify(t.name) === s) || (s.length >= 4 ? tools.find((t) => t.slug.startsWith(s + "-") || slugify(t.name).startsWith(s + "-")) : null) || null;
}
// The check matcher also answers topic searches ("telegram bot", "zcash wallet"); in a setup list only a real name counts.
function namedBy(e, q) {
  const n = String(q || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return !!n && [e.name, e.slug, ...(e.aliases || [])].some((x) => { const c = String(x || "").toLowerCase().replace(/[^a-z0-9]/g, ""); return c === n || (n.length >= 3 && c.includes(n)) || (c.length >= 4 && n.includes(c)); });
}
function since12(today) { const d = new Date(today + "T00:00:00Z"); d.setUTCFullYear(d.getUTCFullYear() - 1); return d.toISOString().slice(0, 10); }
function fromService(e, d, verdict, today) {
  const t = e.listing_name ? d.tools.find((x) => x.name === e.listing_name) : null;
  const inc = (e.incidents || []).filter((i) => i.date);
  const recent = inc.filter((i) => i.date >= since12(today)).sort((a, b) => (a.date < b.date ? 1 : -1));
  const bad = verdict === "lookalike" || verdict === "known_fake";
  const flags = [];
  if (bad) flags.push("not_official");
  if (e.status) flags.push("active_incident");
  if ((e.custody || {}).who_holds_keys === "service") flags.push("service_holds_keys");
  if (recent.length) flags.push("recent_incident");
  const score = t && t.risk_v2 ? { kind: "Agent Risk Score", value: `${pct(t.risk_v2)}%${t.risk_v2.partial ? " (partial)" : ""}` } : t ? { kind: "Safety score", value: `${t.safety_pct}%${t.safety_partial ? " (partial)" : ""}` } : null;
  return { name: e.name, type: KIND[e.kind] || e.kind, page: `https://tradingagentstack.com/check/${e.slug}/`, token: (bad ? "x:" : "c:") + e.slug,
    link_verdict: verdict && verdict !== "name" ? verdict : null,
    keys: KEYS[(e.custody || {}).who_holds_keys] || null, keys_source: (e.custody || {}).source || null,
    worst_case: e.worst_case || null, status: e.status || null, score,
    incidents_last_12_months: recent.length, latest_incident: recent[0] ? { date: recent[0].date, title: recent[0].title, source: recent[0].source } : null,
    data_breaches: ((e.privacy || {}).breaches || []).length || (e.privacy ? 0 : null),
    first_fix: bad ? `Don't connect, sign or enter keys. Use only the official links on ${e.name}'s check page.` : (e.safe_setup || [])[0] || null,
    flags, last_checked: e.last_checked };
}
function fromTool(t, d, today) {
  const recent = (d.incidents || []).filter((i) => (i.tools || []).includes(t.name) && i.date >= since12(today)).sort((a, b) => (a.date < b.date ? 1 : -1));
  const flags = [];
  const ri = (t.risk_v2 || {}).inputs || {};
  const noLimits = (ri.limits || {}).points === 0 && (ri.withdraw || {}).points === 0;
  if (t.who_places_order === "AI trades directly") flags.push("ai_trades_directly");
  if (noLimits) flags.push("no_limits");
  if (recent.length) flags.push("recent_incident");
  if (t.who_places_order === "Approval optional") flags.push("approval_optional");
  const paper = /paper|demo|sandbox|testnet/i.test(t.live_vs_paper || "");
  const fix = noLimits ? "Add spend caps and a destination allowlist outside the AI before you fund it, and keep only a small balance in the agent's wallet."
    : t.who_places_order === "AI trades directly" || t.who_places_order === "Approval optional"
    ? (paper ? "Start on paper first, then cap order size and daily loss and require your approval before going live." : "Cap order size and daily loss and require your approval for each order before going live.")
    : paper ? "Start on paper, demo or testnet first." : null;
  return { name: t.name, type: t.category_label, page: t.page, token: "t:" + t.slug, link_verdict: null,
    keys: (ri.custody || {}).note || null, keys_source: (ri.custody || {}).source || null, worst_case: null, status: null,
    who_places_order: t.who_places_order || null, order_note: t.order_gating_note || null,
    score: t.risk_v2 ? { kind: "Agent Risk Score", value: `${pct(t.risk_v2)}%${t.risk_v2.partial ? " (partial)" : ""}` } : { kind: "Safety score", value: `${t.safety_pct}%${t.safety_partial ? " (partial)" : ""}` },
    incidents_last_12_months: recent.length, latest_incident: recent[0] ? { date: recent[0].date, title: recent[0].title, source: recent[0].source } : null,
    data_breaches: null, first_fix: fix, flags, last_checked: t.last_checked };
}
// items: strings (names, links, @handles, slugs) or share tokens "c:<check slug>", "t:<tool slug>", "x:<check slug>" (a non-official link using that name).
export function setupReport(items, d, matchCheck, today) {
  if (!Array.isArray(items) || !items.length) throw new Error("items is required: a list of the bots, exchanges, wallets or connectors you use, e.g. ['Phantom', 'Trojan', 'Alpaca MCP server'].");
  today = today || (d.meta && String(d.meta.generated || "").slice(0, 10)) || new Date().toISOString().slice(0, 10);
  const E = d.checks || [], T = d.tools || [], out = [], seen = new Set();
  for (const raw of items.slice(0, MAX_ITEMS)) {
    const q = String(raw == null ? "" : raw).trim().slice(0, 300); if (!q) continue;
    let r = null; const tk = /^([ctx]):([a-z0-9-]+)$/.exec(q);
    if (tk) {
      if (tk[1] === "t") { const t = T.find((x) => x.slug === tk[2]); if (t) r = fromTool(t, d, today); }
      else { const e = E.find((x) => x.slug === tk[2]); if (e) r = fromService(e, d, tk[1] === "x" ? "lookalike" : null, today); }
    } else {
      const m = matchCheck(q, E); const e = m.entry ? E.find((x) => x.slug === m.entry) : null;
      if (e && (m.verdict !== "name" || namedBy(e, q))) r = fromService(e, d, m.verdict, today);
      else { const t = findTool(T, q); if (t) r = fromTool(t, d, today); }
    }
    if (r && seen.has(r.token)) continue;
    if (r) seen.add(r.token);
    out.push(r ? { input: tk ? (tk[1] === "x" ? `A link using ${r.name}'s name` : r.name) : q, ...r } : { input: q, name: null, unknown: true, note: "Not tracked yet. Unknown does not mean safe: if it asks for your seed phrase, private key or a token approval, stop." });
  }
  let biggest = null;
  for (const [flag, why] of RISK_ORDER) { const hit = out.find((x) => (x.flags || []).includes(flag)); if (hit) { biggest = { name: hit.name, flag, why, fix: flag === "active_incident" && hit.status ? hit.status : hit.first_fix, page: hit.page }; break; } }
  const toks = out.filter((x) => x.token).map((x) => x.token);
  return { items: out, biggest_risk: biggest, rule: RISK_ORDER.map(([, w]) => w).join(" > "), unknown: out.filter((x) => x.unknown).map((x) => x.input),
    report_url: toks.length ? SETUP_BASE + "?s=" + toks.join(",") : null, as_of: today };
}
