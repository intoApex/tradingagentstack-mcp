import { chmodSync } from "node:fs";
try { chmodSync(new URL("../dist/index.js", import.meta.url), 0o755); } catch {}
