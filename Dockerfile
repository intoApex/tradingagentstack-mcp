# Runs the read-only TradingAgentStack MCP server over stdio. No API key, sign-in or configuration.
# The dataset is fetched from https://tradingagentstack.com/data/tools.json on first use and cached for an hour.
# The build also bundles a copy as the offline fallback, the same as the npm package's prepack step; if that
# download fails at build time the server still starts and fetches the data when a tool is called.
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY src ./src
COPY scripts ./scripts
RUN node scripts/copy-data.js || echo "no bundled dataset: the server fetches it at run time"
ENTRYPOINT ["node", "src/index.js"]
