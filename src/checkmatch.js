// TAS Check matcher: given what someone is about to connect (a name, a link, a Telegram or X handle, a GitHub repo),
// find the entry and say whether the link is on that entry's official list. Shared by the /check/ page (browser) and
// the MCP check tool. No dependencies. Verdicts:
//   official        the link/handle is on the entry's official list (confirmed from two independent places)
//   listed          on the entry's list, but not confirmed from two places (links_status third_party or partial)
//   known_fake      a reputable source named this exact link as a fake
//   lookalike       not on any official list, but it uses an entry's brand name or is a near-miss of an official domain
//   name            matched by name only (no link given)
//   unknown         nothing we track
const MULTI = new Set(["co.uk", "com.au", "co.jp", "com.br", "co.in", "com.tr"]);
const GENERIC = new Set(["wallet", "trade", "trading", "exchange", "swap", "intents", "money", "app", "bot", "sol", "solana", "near", "edge", "stack", "advanced", "bloom", "photon", "sigma", "terminal", "cake", "feather", "gemini", "padre", "nova", "jupiter", "shuriken"]);

export function regDomain(host) {
  const p = String(host || "").toLowerCase().replace(/\.$/, "").split(".").filter(Boolean);
  if (p.length <= 2) return p.join(".");
  const last2 = p.slice(-2).join(".");
  return MULTI.has(last2) ? p.slice(-3).join(".") : last2;
}
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const clean = (s) => String(s || "").trim().toLowerCase();
const handle = (s) => clean(s).replace(/^@/, "").replace(/^https?:\/\//, "").replace(/^(www\.)?(t|telegram)\.me\//, "").replace(/^(www\.)?(x|twitter)\.com\//, "").split(/[/?#]/)[0];
const ghPath = (s) => clean(s).replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/^github\.com\//, "").replace(/\.git$/, "").split(/[?#]/)[0].split("/").filter(Boolean).slice(0, 2).join("/");

// Store listings (Chrome Web Store, Firefox add-ons, App Store, Google Play) are matched by their ID, not their URL text.
export function appKey(raw) {
  const s = clean(raw).replace(/^https?:\/\//, "").replace(/^www\./, "");
  let m;
  if ((m = s.match(/^(?:chromewebstore\.google\.com\/detail|chrome\.google\.com\/webstore\/detail)\/(?:([^/?#]+)\/)?([a-p]{32})/))) return { key: "chrome:" + m[2], name: m[1] || "" };
  if ((m = s.match(/^addons\.mozilla\.org\/(?:[a-z-]+\/)?firefox\/addon\/([^/?#]+)/))) return { key: "firefox:" + m[1], name: m[1] };
  if ((m = s.match(/^apps\.apple\.com\/.*?(?:\/app\/([^/?#]+))?\/id(\d+)/))) return { key: "ios:" + m[2], name: m[1] || "" };
  if ((m = s.match(/^play\.google\.com\/store\/apps\/details\?(?:.*&)?id=([a-z0-9._]+)/))) return { key: "android:" + m[1], name: m[1] };
  return null;
}
// What kind of thing did the user give us?
export function parseInput(raw) {
  const s = clean(raw);
  if (!s) return { type: "empty" };
  if (/^@[a-z0-9_]{3,}$/.test(s)) return { type: "handle", value: s.slice(1) };
  let u = null;
  if (/^[a-z]+:\/\//.test(s) || /^[a-z0-9-]+(\.[a-z0-9-]+)+([/:?#].*)?$/.test(s)) {
    try { u = new URL(/^[a-z]+:\/\//.test(s) ? s : "https://" + s); } catch { u = null; }
  }
  if (u) {
    const host = u.hostname.replace(/^www\./, "");
    if (host === "t.me" || host === "telegram.me") return { type: "telegram", value: handle(s) };
    if (host === "x.com" || host === "twitter.com") return { type: "x", value: handle(s) };
    if (host === "github.com") return { type: "github", value: ghPath(s) };
    const ak = appKey(s);
    if (ak) return { type: "app", value: ak.key, name: ak.name, host };
    return { type: "domain", value: host, reg: regDomain(host) };
  }
  return { type: "name", value: s };
}

function brandTokens(e) {
  const t = new Set();
  const add = (x) => { x = clean(x).replace(/[^a-z0-9]/g, ""); if (x.length >= 4 && !GENERIC.has(x)) t.add(x); };
  add(e.slug); add(e.name); String(e.slug).split("-").forEach(add);
  for (const d of (e.official && e.official.domains) || []) add(regDomain(d).split(".")[0]);
  for (const k of e.brand_tokens || []) add(k);
  return [...t];
}
const offList = (e, key) => ((e.official && e.official[key]) || []).map((v) => key === "github" ? ghPath(v) : key === "domains" ? clean(v).replace(/^www\./, "") : handle(v));

export function matchCheck(raw, entries) {
  const q = parseInput(raw);
  if (q.type === "empty") return { verdict: "empty", input: raw };
  const res = (verdict, e, extra = {}) => ({ verdict, input: raw, parsed: q, entry: e ? e.slug : null, name: e ? e.name : null, ...extra });
  // 1. exact known fakes
  for (const e of entries) for (const f of e.known_fakes || []) {
    const v = clean(f.value);
    if ((q.type === "domain" && (q.value === v || q.reg === regDomain(v))) || ((q.type === "telegram" || q.type === "x" || q.type === "handle") && handle(v) === q.value))
      return res("known_fake", e, { source: f.source });
  }
  // 2. exact official matches
  for (const e of entries) {
    const st = e.links_status === "verified" ? "official" : "listed";
    if (q.type === "domain") {
      for (const d of offList(e, "domains")) {
        if (q.value === d || q.value.endsWith("." + d) || (regDomain(d) === d && q.reg === d)) return res(st, e, { matched: d, kind: "domain" });
      }
    } else if (q.type === "telegram" || q.type === "x" || q.type === "handle") {
      const keys = q.type === "telegram" ? ["telegram"] : q.type === "x" ? ["x"] : ["telegram", "x"];
      for (const k of keys) for (const h of offList(e, k)) if (h === q.value) return res(st, e, { matched: "@" + h, kind: k });
    } else if (q.type === "github") {
      for (const g of offList(e, "github")) if (q.value === g || (g.split("/").length === 1 && q.value.split("/")[0] === g)) return res(st, e, { matched: "github.com/" + g, kind: "github" });
    } else if (q.type === "app") {
      for (const a of (e.official && e.official.apps) || []) { const k = appKey(a); if (k && k.key === q.value) return res(st, e, { matched: a, kind: "app" }); }
    }
  }
  // 3. lookalikes: brand name inside a link/handle that isn't official, or a near-miss of an official domain
  if (q.type !== "name") {
    const hay = (q.type === "app" ? q.name : q.value).replace(/[^a-z0-9]/g, "");
    const label = q.type === "domain" ? q.reg.split(".")[0] : q.value.replace(/[^a-z0-9]/g, "");
    for (const e of entries) {
      for (const t of brandTokens(e)) if (hay.includes(t)) return res("lookalike", e, { reason: `uses "${t}" but isn't on ${e.name}'s official list` });
      for (const d of offList(e, "domains")) {
        const ol = regDomain(d).split(".")[0];
        if (ol.length >= 5 && label !== ol && lev(label, ol) <= 2) return res("lookalike", e, { reason: `one or two letters away from ${regDomain(d)}` });
      }
    }
    return res("unknown", null);
  }
  // 4. name search
  const n = q.value.replace(/[^a-z0-9]/g, "");
  const hits = entries.filter((e) => [e.name, e.slug, ...(e.aliases || [])].some((x) => { const c = clean(x).replace(/[^a-z0-9]/g, ""); return c === n || (n.length >= 3 && c.includes(n)) || (c.length >= 4 && n.includes(c)); }));
  if (hits.length) return { verdict: "name", input: raw, parsed: q, entry: hits[0].slug, name: hits[0].name, also: hits.slice(1, 5).map((e) => e.slug) };
  // 5. topic words ("zcash wallet", "monero", "telegram bot"): entries whose assets or kind mention every word
  const KW = { telegram: ["telegram_bot"], bot: ["telegram_bot", "web_trading_terminal"], terminal: ["web_trading_terminal"], exchange: ["exchange"], swap: ["swap_service"], wallet: ["privacy_wallet", "wallet"] };
  const words = q.value.split(/\s+/).filter((w) => w.length >= 3);
  const topic = entries.filter((e) => words.length && words.every((w) => (KW[w] || []).includes(e.kind) || (e.chains_or_assets || []).some((c) => clean(c).includes(w))));
  if (topic.length) return { verdict: "name", input: raw, parsed: q, entry: topic[0].slug, name: topic[0].name, also: topic.slice(1, 8).map((e) => e.slug) };
  return res("unknown", null);
}
