// Bundle the latest published dataset as the offline fallback.
import { writeFileSync, mkdirSync } from "node:fs";
const r = await fetch("https://tradingagentstack.com/data/tools.json");
if (!r.ok) throw new Error("HTTP " + r.status);
mkdirSync(new URL("../data/", import.meta.url), { recursive: true });
writeFileSync(new URL("../data/tools.json", import.meta.url), await r.text());
console.log("bundled data/tools.json");
