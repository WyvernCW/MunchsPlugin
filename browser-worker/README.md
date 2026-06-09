# Munch Scraper — Cloudflare Worker

A Cloudflare Worker that scrapes websites. Since it runs on Cloudflare's own
network, it naturally bypasses Cloudflare WAF/JS challenges — including sites
with "I'm Under Attack" mode, JS challenges, and CAPTCHA challenges.

## Why this works

Cloudflare Workers make fetch requests FROM Cloudflare's internal network,
not from the public internet. When a request targets a Cloudflare-protected
site, Cloudflare sees it as an internal/origin request and does NOT present
the challenge page. This is the most reliable way to scrape Cloudflare sites.

## Deploy (2 minutes)

### Option A: Cloudflare Dashboard (easiest)

1. Go to https://dash.cloudflare.com/ → **Workers & Pages** → **Create Worker**
2. Delete the default code, paste the contents of `worker.js`
3. Click **Deploy**
4. You'll get a URL like `https://munch-scraper.YOUR-NAME.workers.dev`
5. Set `MUNCH_CF_WORKER_URL` in your MCP server environment:
   ```
   MUNCH_CF_WORKER_URL=https://munch-scraper.YOUR-NAME.workers.dev/scrape
   ```

### Option B: Auto-deploy script (PowerShell)

```powershell
.\deploy.ps1 -CloudflareApiToken "YOUR_API_TOKEN"
```

Get your API token from: https://dash.cloudflare.com/profile/api-tokens
(Use "Edit Cloudflare Workers" template)

### Option C: Wrangler CLI

```bash
cd browser-worker
npm install wrangler --save-dev
npx wrangler deploy
```

## Verify

```bash
curl https://YOUR-WORKER.workers.dev/scrape?url=https://example.com
```

## How it integrates with the MCP server

Set the environment variable:
```
MUNCH_CF_WORKER_URL=https://YOUR-WORKER.workers.dev/scrape
```

The MCP server will automatically use it as the FIRST strategy for
`browser_scrape` — it's the fastest and most reliable method.
