#!/usr/bin/env node
/**
 * munch Web Tools v1.0
 * Search and scrape tools for the MCP server.
 * Supports: web search, web scraping, GitHub, YouTube, Wikipedia,
 * X/Twitter, TikTok, Gmail, Google Drive, and browser-based
 * scraping for Cloudflare-protected sites.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import os from "os";
import { randomUUID } from "crypto";

// ── Constants ────────────────────────────────────────────

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const TIMEOUT_MS = 15_000;
const MEMORY_DIR = join(os.homedir(), ".munchmemory");
const OAUTH_STORE = join(MEMORY_DIR, "google-oauth.json");

// ── Helpers ──────────────────────────────────────────────

function memoryDir(): string {
  mkdirSync(MEMORY_DIR, { recursive: true });
  return MEMORY_DIR;
}

async function fetchText(
  url: string,
  options?: { timeout?: number; headers?: Record<string, string> },
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options?.timeout ?? TIMEOUT_MS,
  );
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/json,*/*",
        ...options?.headers,
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

function htmlToText(html: string): string {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<h[1-6][^>]*>/gi, "\n\n## ")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<p[^>]*>/gi, "\n\n")
    .replace(/<\/p>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
  return text;
}

function extractBody(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch?.[1] ?? html;
}

function extractMetaTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return titleMatch?.[1]?.trim() ?? "";
}

// ── Tool: web_search ─────────────────────────────────────

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const html = await fetchText(url);

  const results: SearchResult[] = [];
  const linkRegex =
    /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRegex =
    /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
  const urlRegex = /uddg=([^&]+)/;

  const links: { href: string; title: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = linkRegex.exec(html)) !== null) {
    const rawUrl = m[1];
    const title = m[2].replace(/<[^>]+>/g, "").trim();
    const decoded = rawUrl.includes("uddg=")
      ? decodeURIComponent(rawUrl.match(urlRegex)?.[1] ?? rawUrl)
      : rawUrl;
    if (title) links.push({ href: decoded, title });
  }

  const snippets: string[] = [];
  while ((m = snippetRegex.exec(html)) !== null) {
    const snippet = m[1].replace(/<[^>]+>/g, "").trim();
    if (snippet) snippets.push(snippet);
  }

  for (let i = 0; i < links.length; i++) {
    results.push({
      title: links[i].title,
      url: links[i].href,
      snippet: snippets[i] ?? "",
    });
  }

  return results;
}

// ── Tool: github_search ──────────────────────────────────

async function searchGitHub(
  query: string,
  type: string,
): Promise<string> {
  const token = process.env.GITHUB_TOKEN || process.env.MUNCH_GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let endpoint: string;
  switch (type) {
    case "repositories":
      endpoint = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=10&sort=stars`;
      break;
    case "code":
      endpoint = `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=10`;
      headers.Accept = "application/vnd.github.v3.text-match+json";
      break;
    case "issues":
      endpoint = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=10&sort=updated`;
      break;
    case "users":
      endpoint = `https://api.github.com/search/users?q=${encodeURIComponent(query)}&per_page=10`;
      break;
    default:
      endpoint = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=10`;
  }

  const json = await fetchText(endpoint, { headers });
  const data = JSON.parse(json) as Record<string, unknown>;
  const items = data.items as Array<Record<string, unknown>> | undefined;
  if (!items || items.length === 0) return "No results found.";

  function getStr(o: Record<string, unknown>, k: string): string {
    return (o[k] as string | undefined) ?? "?";
  }

  const lines: string[] = [];
  for (const item of items) {
    const htmlUrl = getStr(item, "html_url");
    if (type === "repositories") {
      const fullName = getStr(item, "full_name") || getStr(item, "name");
      const stars = String(item.stargazers_count ?? "0");
      const desc = getStr(item, "description");
      lines.push(`- ${fullName} ⭐${stars}\n  ${desc}\n  ${htmlUrl}`);
    } else if (type === "code") {
      const path = getStr(item, "path");
      const repo = (item.repository as Record<string, unknown> | undefined);
      const repoName = repo ? getStr(repo, "full_name") : "?";
      lines.push(`- ${path} in ${repoName}\n  ${htmlUrl}`);
    } else if (type === "issues") {
      const state = getStr(item, "state");
      const title = getStr(item, "title");
      const body = getStr(item, "body").slice(0, 300);
      lines.push(`- [${state}] ${title}\n  ${htmlUrl}\n  ${body}`);
    } else if (type === "users") {
      const login = getStr(item, "login");
      const kind = getStr(item, "type");
      lines.push(`- ${login} (${kind})\n  ${htmlUrl}`);
    }
  }
  return lines.join("\n\n");
}

// ── Tool: youtube_search ─────────────────────────────────

async function searchYouTube(query: string): Promise<string> {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const html = await fetchText(url);

  const lines: string[] = [];
  const videoRegex =
    /"videoId":"([^"]+)"[^}]*"title":\{"runs":\[\{"text":"([^"]+)"/
    .source;

  // Try to extract from initial data
  const dataMatch = html.match(/var ytInitialData\s*=\s*([^;]+);/);
  if (dataMatch) {
    try {
      const data = JSON.parse(dataMatch[1]);
      const contents =
        data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
          ?.sectionListRenderer?.contents ?? [];
      for (const section of contents) {
        const items =
          section?.itemSectionRenderer?.contents ?? [];
        for (const item of items) {
          const vr = item?.videoRenderer;
          if (!vr) continue;
          const id = vr.videoId;
          const title = vr.title?.runs?.[0]?.text ?? "?";
          const channel = vr.ownerText?.runs?.[0]?.text ?? "?";
          const views = vr.viewCountText?.simpleText ?? "?";
          const length = vr.lengthText?.simpleText ?? "?";
          lines.push(
            `- ${title} (${length}) — ${channel} [${views}]` +
              `\n  https://www.youtube.com/watch?v=${id}`,
          );
        }
      }
    } catch {
      // fallback
    }
  }

  if (lines.length === 0) {
    const ids = [...html.matchAll(/"videoId":"([^"]+)"/g)].slice(0, 10);
    const titles = [
      ...html.matchAll(/"title":\{"runs":\[\{"text":"([^"]+)"\}\]\}/g),
    ];
    for (let i = 0; i < Math.min(ids.length, 10); i++) {
      lines.push(
        `- ${titles[i]?.[1] ?? "?"}\n  https://www.youtube.com/watch?v=${ids[i][1]}`,
      );
    }
  }

  return lines.length > 0
    ? lines.join("\n\n")
    : "No video results found. YouTube may be rate-limiting.";
}

// ── Tool: wikipedia_search ───────────────────────────────

async function searchWikipedia(
  query: string,
  language: string,
): Promise<string> {
  const api = `https://${language}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=10&srprop=snippet|titlesnippet`;
  const json = await fetchText(api, {
    headers: { Accept: "application/json" },
  });
  const data = JSON.parse(json) as Record<string, unknown>;
  const results = (data?.query as Record<string, unknown>)
    ?.search as Array<Record<string, unknown>> | undefined;
  if (!results || results.length === 0) return "No results found.";

  return results
    .map((r) => {
      const snippet = (r.snippet as string ?? "")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .slice(0, 250);
      return (
        `- ${r.title as string}` +
        `\n  https://${language}.wikipedia.org/wiki/${encodeURIComponent(r.title as string)}` +
        `\n  ${snippet}`
      );
    })
    .join("\n\n");
}

// ── Tool: twitter_search ─────────────────────────────────

async function searchTwitter(query: string): Promise<string> {
  const errors: string[] = [];

  // Attempt 1: nitter.net (privacy frontend)
  try {
    const url = `https://nitter.net/search?q=${encodeURIComponent(query)}&f=tweets`;
    const html = await fetchText(url, { timeout: 8000 });
    const tweets: string[] = [];
    const tweetBlocks = html.match(
      /<div class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g,
    );
    if (tweetBlocks) {
      for (const block of tweetBlocks.slice(0, 10)) {
        const content = block
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim();
        if (content && content.length > 5) tweets.push(content);
      }
    }
    const usernames = [...html.matchAll(
      /<a class="username"[^>]*>([^<]*)<\/a>/g,
    )];
    const resultLines = tweets.map((t, i) => {
      const user = usernames[i]?.[1]?.trim() ?? "?";
      return `- ${user}: ${t.slice(0, 280)}`;
    });
    if (resultLines.length > 0) return resultLines.join("\n\n");
    errors.push("nitter: no tweets extracted");
  } catch (e) {
    errors.push(`nitter: ${(e as Error).message}`);
  }

  // Attempt 2: Twitter syndication API (no auth)
  try {
    const url = `https://api.twitter.com/2/search/adaptive.json?q=${encodeURIComponent(query)}&count=10`;
    const json = await fetchText(url, {
      headers: {
        Accept: "application/json",
        "x-guest-token": "",
      },
      timeout: 8000,
    });
    const data = JSON.parse(json) as Record<string, unknown>;
    const globalObjects = data?.globalObjects as Record<string, unknown> ?? {};
    const tweets = globalObjects.tweets as Record<string, unknown> ?? {};
    const users = globalObjects.users as Record<string, unknown> ?? {};
    const lines: string[] = [];
    for (const [id, tweet] of Object.entries(tweets)) {
      const t = tweet as Record<string, unknown>;
      const userId = t.user_id_str as string;
      const username = (users[userId] as Record<string, unknown>)
        ?.screen_name as string ?? "?";
      lines.push(
        `- @${username}: ${(t.full_text as string ?? t.text as string ?? "").slice(0, 280)}`,
      );
    }
    if (lines.length > 0) return lines.join("\n\n");
    errors.push("syndication: no tweets");
  } catch (e) {
    errors.push(`syndication: ${(e as Error).message}`);
  }

  return `Could not fetch X/Twitter results. Attempted methods:\n${errors.map((e) => `- ${e}`).join("\n")}\n\nTry web_search or browser_scrape instead.`;
}

// ── Tool: tiktok_search ──────────────────────────────────

async function searchTikTok(query: string): Promise<string> {
  const errors: string[] = [];

  // Attempt: scrape TikTok search page
  try {
    const url = `https://www.tiktok.com/search?q=${encodeURIComponent(query)}`;
    const html = await fetchText(url, { timeout: 10000 });
    const ids = [
      ...html.matchAll(/"id":"(\d{17,})"/g),
    ];
    const descs = [
      ...html.matchAll(/"desc":"([^"]+)"(?:[^}]*"author":"([^"]+)")?/g),
    ];

    if (ids.length > 0 || descs.length > 0) {
      const lines: string[] = [];
      const limit = Math.min(Math.max(ids.length, descs.length), 10);
      for (let i = 0; i < limit; i++) {
        const desc = descs[i]?.[1] ?? "?";
        const author = descs[i]?.[2] ?? "?";
        const id = ids[i]?.[1] ?? "";
        lines.push(
          `- ${author}: ${desc.slice(0, 150)}` +
            (id ? `\n  https://www.tiktok.com/@${author}/video/${id}` : ""),
        );
      }
      return lines.join("\n\n");
    }
    errors.push("tiktok.com: no video data extracted");
  } catch (e) {
    errors.push(`tiktok.com: ${(e as Error).message}`);
  }

  return `Could not fetch TikTok results. TikTok has aggressive anti-scraping.\nAttempted: ${errors.join("; ")}\n\nTry browser_scrape with a headless browser instead.`;
}

// ── Google OAuth (for Gmail & Drive) ─────────────────────

interface GoogleOAuthState {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  refreshToken?: string;
  accessToken?: string;
  expiry?: number;
}

function loadGoogleOAuth(): GoogleOAuthState | null {
  try {
    const raw = readFileSync(OAUTH_STORE, "utf8");
    return JSON.parse(raw) as GoogleOAuthState;
  } catch {
    return null;
  }
}

function saveGoogleOAuth(state: GoogleOAuthState): void {
  mkdirSync(dirname(OAUTH_STORE), { recursive: true });
  writeFileSync(OAUTH_STORE, JSON.stringify(state, null, 2), "utf8");
}

function getGoogleOAuthUrls(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} {
  const clientId =
    process.env.GOOGLE_CLIENT_ID ??
    process.env.MUNCH_GOOGLE_CLIENT_ID ??
    "";
  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET ??
    process.env.MUNCH_GOOGLE_CLIENT_SECRET ??
    "";
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    process.env.MUNCH_GOOGLE_REDIRECT_URI ??
    "http://localhost:8080/oauth2callback";
  return { clientId, clientSecret, redirectUri };
}

function getGoogleAuthUrl(state: GoogleOAuthState): string {
  const scope = encodeURIComponent(
    "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/drive.readonly",
  );
  return (
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${state.clientId}&` +
    `redirect_uri=${encodeURIComponent(state.redirectUri ?? "http://localhost:8080/oauth2callback")}&` +
    `response_type=code&` +
    `access_type=offline&` +
    `scope=${scope}&` +
    `prompt=consent`
  );
}

async function exchangeGoogleCode(
  code: string,
  state: GoogleOAuthState,
): Promise<void> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: state.clientId,
      client_secret: state.clientSecret,
      redirect_uri: state.redirectUri ?? "http://localhost:8080/oauth2callback",
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${text}`);
  }
  const data = (await res.json()) as Record<string, unknown>;
  state.refreshToken = data.refresh_token as string ?? state.refreshToken;
  state.accessToken = data.access_token as string;
  state.expiry = Date.now() + ((data.expires_in as number ?? 3600) - 60) * 1000;
  saveGoogleOAuth(state);
}

async function ensureGoogleToken(state: GoogleOAuthState): Promise<string> {
  if (state.expiry && state.accessToken && Date.now() < state.expiry) {
    return state.accessToken;
  }
  if (!state.refreshToken) {
    throw new Error(
      `Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment, then:\n` +
        `1. Visit this URL to authorize:\n${getGoogleAuthUrl(state)}\n` +
        `2. Run the gmail_setup or drive_setup tool with the authorization code.`,
    );
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: state.refreshToken,
      client_id: state.clientId,
      client_secret: state.clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${text}`);
  }
  const data = (await res.json()) as Record<string, unknown>;
  state.accessToken = data.access_token as string;
  state.expiry = Date.now() + ((data.expires_in as number ?? 3600) - 60) * 1000;
  saveGoogleOAuth(state);
  return state.accessToken;
}

async function searchGmail(
  query: string | undefined,
  maxResults: number,
): Promise<string> {
  const state = loadGoogleOAuth();
  if (!state?.clientId) {
    const urls = getGoogleOAuthUrls();
    if (!urls.clientId) {
      return (
        "Gmail search requires Google OAuth setup.\n" +
        "1. Create a Google Cloud project and enable Gmail API\n" +
        "2. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables\n" +
        "3. Use gmail_setup tool to authorize"
      );
    }
    const newState: GoogleOAuthState = {
      clientId: urls.clientId,
      clientSecret: urls.clientSecret,
    };
    saveGoogleOAuth(newState);
    return `Gmail OAuth not yet authorized.\nVisit this URL to authorize:\n${getGoogleAuthUrl(newState)}\n\nThen run gmail_setup with the authorization code.`;
  }

  try {
    const token = await ensureGoogleToken(state);
    const q = query ? `&q=${encodeURIComponent(query)}` : "";
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}${q}`;
    const json = await fetchText(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = JSON.parse(json) as Record<string, unknown>;
    const messages = data.messages as Array<Record<string, unknown>> ?? [];

    if (messages.length === 0) return "No messages found.";

    const results: string[] = [];
    for (const msg of messages.slice(0, maxResults)) {
      const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id as string}`;
      const msgJson = await fetchText(msgUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const msgData = JSON.parse(msgJson) as Record<string, unknown>;
      const headers = msgData.payload as Record<string, unknown>;
      const headerList = (headers?.headers as Array<Record<string, unknown>>) ?? [];
      const getHeader = (name: string): string =>
        (headerList.find(
          (h: Record<string, unknown>) => h.name === name,
        )?.value as string) ?? "";
      const subject = getHeader("Subject");
      const from = getHeader("From");
      const date = getHeader("Date");
      const snippet = (msgData.snippet as string ?? "").slice(0, 200);
      results.push(`- From: ${from}\n  Subject: ${subject}\n  Date: ${date}\n  ${snippet}`);
    }
    return results.join("\n\n");
  } catch (e) {
    return `Gmail search error: ${(e as Error).message}`;
  }
}

async function searchDrive(
  query: string | undefined,
  maxResults: number,
): Promise<string> {
  const state = loadGoogleOAuth();
  if (!state?.clientId) {
    const urls = getGoogleOAuthUrls();
    if (!urls.clientId) {
      return (
        "Drive search requires Google OAuth setup.\n" +
        "1. Create a Google Cloud project and enable Drive API\n" +
        "2. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables\n" +
        "3. Use drive_setup tool to authorize"
      );
    }
    const newState: GoogleOAuthState = {
      clientId: urls.clientId,
      clientSecret: urls.clientSecret,
    };
    saveGoogleOAuth(newState);
    return `Drive OAuth not yet authorized.\nVisit this URL to authorize:\n${getGoogleAuthUrl(newState)}\n\nThen run drive_setup with the authorization code.`;
  }

  try {
    const token = await ensureGoogleToken(state);
    const q = query ? `&q=${encodeURIComponent(query)}` : "";
    const url = `https://www.googleapis.com/drive/v3/files?pageSize=${maxResults}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink)${q}`;
    const json = await fetchText(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = JSON.parse(json) as Record<string, unknown>;
    const files = data.files as Array<Record<string, unknown>> ?? [];

    if (files.length === 0) return "No files found.";
    return files
      .map(
        (f) =>
          `- ${f.name as string} (${(f.mimeType as string).split("/").pop()})` +
          `\n  Modified: ${f.modifiedTime as string}` +
          `\n  ${f.webViewLink as string}`,
      )
      .join("\n\n");
  } catch (e) {
    return `Drive search error: ${(e as Error).message}`;
  }
}

// ── Tool: browser_scrape ─────────────────────────────────

function detectChrome(): string | undefined {
  if (process.platform === "win32") {
    const paths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      ...(process.env.LOCALAPPDATA
        ? [
            join(process.env.LOCALAPPDATA, "Google\\Chrome\\Application\\chrome.exe"),
            join(process.env.LOCALAPPDATA, "Microsoft\\Edge\\Application\\msedge.exe"),
          ]
        : []),
    ];
    for (const p of paths) {
      try {
        if (existsSync(p)) return p;
      } catch {
        continue;
      }
    }
  } else if (process.platform === "darwin") {
    const paths = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    ];
    for (const p of paths) {
      if (existsSync(p)) return p;
    }
  } else {
    const paths = [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      "/snap/bin/chromium",
    ];
    for (const p of paths) {
      if (existsSync(p)) return p;
    }
  }
  return undefined;
}

async function browserScrape(url: string): Promise<string> {
  const errors: string[] = [];

  // Strategy 0: Cloudflare Worker proxy (if configured)
  // Cloudflare Workers run on Cloudflare's network, so they naturally bypass
  // Cloudflare WAF/JS challenges. This is the most effective strategy.
  const cfWorkerUrl = process.env.MUNCH_CF_WORKER_URL;
  if (cfWorkerUrl) {
    try {
      const res = await fetch(`${cfWorkerUrl}?url=${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        const text = await res.text();
        if (text.length > 100 && !isCloudflareChallenge(text)) {
          return text.slice(0, 15000);
        }
        errors.push("CF Worker: returned Cloudflare challenge page");
      } else {
        errors.push(`CF Worker: HTTP ${res.status}`);
      }
    } catch (e) {
      errors.push(`CF Worker: ${(e as Error).message}`);
    }
  }

  // Strategy 1: @sparticuz/chromium (serverless Vercel/AWS Lambda)
  // Downloads slim Chromium (~50MB) on first call, cached in /tmp for subsequent calls
  try {
    const ChromiumClass = await Function('return import("@sparticuz/chromium")')();
    const executablePath = await ChromiumClass.executablePath();
    let launchBrowser: (opts: Record<string, unknown>) => Promise<any>;

    try {
      const PuppeteerExtra = (await Function('return import("puppeteer-extra")')()).default;
      const StealthPlugin = (await Function('return import("puppeteer-extra-plugin-stealth")')()).default;
      PuppeteerExtra.use(StealthPlugin());
      launchBrowser = (opts) => PuppeteerExtra.launch(opts);
    } catch {
      const puppeteerCore = await Function('return import("puppeteer-core")')();
      launchBrowser = (opts) => puppeteerCore.launch(opts);
    }

    const browser = await launchBrowser({
      args: [...ChromiumClass.args, "--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
      executablePath,
      headless: true,
    });
    try {
      const page = await browser.newPage();
      await page.setUserAgent(USER_AGENT);
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 3000));
      const title = await page.title();
      const text = await page.evaluate(() => {
        const clone = document.body.cloneNode(true) as HTMLElement;
        const removals = clone.querySelectorAll("script,style,nav,footer,header,iframe,[role=navigation]");
        removals.forEach((el) => el.remove());
        return (clone.textContent ?? "").replace(/\s+/g, " ").slice(0, 15000);
      });
      if (text.length > 50 && !text.includes("Just a moment") && !text.includes("security verification")) {
        return title ? `# ${title}\n\n${text.trim()}` : text.trim();
      }
      errors.push("chromium: Cloudflare challenge page returned");
    } finally {
      await browser.close().catch(() => {});
    }
  } catch (e) {
    errors.push(`chromium: ${(e as Error).message}`);
  }

  // Strategy 2: puppeteer-extra with stealth + local Chrome (desktop)
  const chromePath = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || detectChrome();
  if (chromePath) {
    try {
      const PuppeteerExtra = (await Function('return import("puppeteer-extra")')()).default;
      const StealthPlugin = (await Function('return import("puppeteer-extra-plugin-stealth")')()).default;
      PuppeteerExtra.use(StealthPlugin());
      const browser = await PuppeteerExtra.launch({
        headless: true,
        executablePath: chromePath,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
      });
      try {
        const page = await browser.newPage();
        await page.setUserAgent(USER_AGENT);
        await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
        await new Promise((r) => setTimeout(r, 3000));
        const result = await page.evaluate(() => {
          const clone = document.body.cloneNode(true) as HTMLElement;
          const removals = clone.querySelectorAll("script,style,nav,footer,header,iframe,[role=navigation]");
          removals.forEach((el) => el.remove());
          return { title: document.title ?? "", text: (clone.textContent ?? "").replace(/\s+/g, " ").slice(0, 15000) };
        });
        if (result.text.length > 50) {
          return `# ${result.title}\n\n${result.text.trim()}`;
        }
        errors.push("desktop: empty body");
      } finally {
        await browser.close().catch(() => {});
      }
    } catch (e) {
      errors.push(`desktop: ${(e as Error).message}`);
    }
  }

  // Strategy 3: proxy services (works everywhere, no browser needed)
  const cacheResult = await fetchViaGoogleCache(url);
  if (cacheResult && !cacheResult.includes("not redirected") && !cacheResult.includes("google.com") && !cacheResult.includes("redirected within") && !cacheResult.startsWith("# Google Search")) return `${cacheResult}\n\n*[Scraped via Google Cache]*`;
  errors.push("Google Cache: failed");

  const textiseResult = await fetchViaTextise(url);
  if (textiseResult && !isCloudflareChallenge(textiseResult)) return textiseResult;
  errors.push("Textise: failed");

  const jinaResult = await fetchViaJinaReader(url);
  if (jinaResult && !isCloudflareChallenge(jinaResult)) return jinaResult;
  errors.push("Jina Reader: failed");

  const beeResult = await fetchViaScrapingBee(url);
  if (beeResult) return `${beeResult}\n\n*[Scraped via ScrapingBee]*`;
  errors.push("ScrapingBee: not configured or failed");

  const apiResult = await fetchViaScraperAPI(url);
  if (apiResult) return `${apiResult}\n\n*[Scraped via ScraperAPI]*`;
  errors.push("ScraperAPI: not configured or failed");

  const fireResult = await fetchViaFirecrawl(url);
  if (fireResult) return `${fireResult}\n\n*[Scraped via Firecrawl]*`;
  errors.push("Firecrawl: not configured or failed");

  // Final fallback: direct web_scrape
  try {
    const result = await scrapeUrl(url);
    // Reject Cloudflare challenge pages
    if (isCloudflareChallenge(result)) {
      errors.push("web_scrape: Cloudflare challenge page");
    } else {
      return result;
    }
  } catch (e) {
    errors.push(`web_scrape: ${(e as Error).message}`);
  }

  // Everything failed — provide actionable error
  return (
    `Could not scrape ${url}. All strategies exhausted:\n` +
    errors.map((e) => `  - ${e}`).join("\n") +
    "\n\nThis site has very aggressive anti-bot protection (likely Cloudflare with CAPTCHA).\n" +
    "Options to make scraping work:\n" +
    "1. Deploy the Cloudflare Worker (bypasses Cloudflare — free, no install):\n" +
    "   See browser-worker/README.md for 2-minute deployment\n" +
    "2. Install puppeteer locally and run munch-mcp locally (stdio mode)\n" +
    "3. Set a scraping API key on the server:\n" +
    "   - MUNCH_FIRECRAWL_KEY (free tier: 500 pages/mo)\n" +
    "   - MUNCH_SCRAPINGBEE_KEY (free trial: 2500 credits)\n" +
    "   - MUNCH_SCRAPERAPI_KEY (free tier: 5000 requests/mo)"
  );
}

// ── Proxy / bypass helpers ───────────────────────────────

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
];

let userAgentIndex = 0;
function nextUserAgent(): string {
  const ua = USER_AGENTS[userAgentIndex % USER_AGENTS.length];
  userAgentIndex++;
  return ua;
}

function realisticHeaders(): Record<string, string> {
  return {
    "User-Agent": nextUserAgent(),
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "Sec-GPC": "1",
  };
}

async function fetchViaJinaReader(url: string): Promise<string | null> {
  const jinaUrl = `https://r.jina.ai/http://${encodeURI(url.replace(/^https?:\/\//, ""))}`;
  try {
    const res = await fetch(jinaUrl, {
      signal: AbortSignal.timeout(20000),
      headers: {
        Accept: "text/plain, text/markdown, */*",
        ...(process.env.MUNCH_JINA_API_KEY
          ? { Authorization: `Bearer ${process.env.MUNCH_JINA_API_KEY}` }
          : {}),
      },
    });
    if (!res.ok) return null;
    const text = await res.text();

    if (text.includes("Title:") && text.includes("URL Source:")) {
      const lines = text.split("\n");
      const titleLine = lines.find((l) => l.startsWith("Title:"));
      const title = titleLine?.replace("Title:", "").trim() ?? "";
      const markdownStart = text.indexOf("Markdown Content:");
      const content =
        markdownStart >= 0
          ? text.slice(markdownStart + "Markdown Content:".length).trim()
          : text.slice(0, 12000).trim();
      if (isCloudflareChallenge(content)) return null;
      return title ? `# ${title}\n\n${content}` : content;
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchViaScrapingBee(url: string): Promise<string | null> {
  const key = process.env.MUNCH_SCRAPINGBEE_KEY;
  if (!key) return null;
  try {
    const apiUrl =
      `https://app.scrapingbee.com/api/v1/?api_key=${key}&url=${encodeURIComponent(url)}&render_js=true&premium_proxy=true`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(25000) });
    if (!res.ok) return null;
    const text = await res.text();
    const title = extractMetaTitle(text);
    const body = extractBody(text);
    const clean = htmlToText(body).slice(0, 12000);
    if (isCloudflareChallenge(clean)) return null;
    return title ? `# ${title}\n\n${clean}` : clean;
  } catch {
    return null;
  }
}

async function fetchViaScraperAPI(url: string): Promise<string | null> {
  const key = process.env.MUNCH_SCRAPERAPI_KEY;
  if (!key) return null;
  try {
    const apiUrl =
      `http://api.scraperapi.com/?api_key=${key}&url=${encodeURIComponent(url)}&render=true&country_code=us`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(25000) });
    if (!res.ok) return null;
    const text = await res.text();
    const title = extractMetaTitle(text);
    const body = extractBody(text);
    const clean = htmlToText(body).slice(0, 12000);
    if (isCloudflareChallenge(clean)) return null;
    return title ? `# ${title}\n\n${clean}` : clean;
  } catch {
    return null;
  }
}

async function fetchViaGoogleCache(url: string): Promise<string | null> {
  try {
    const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}&strip=1&vwsrc=0`;
    const res = await fetch(cacheUrl, {
      signal: AbortSignal.timeout(12000),
      headers: { "User-Agent": nextUserAgent() },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const title = extractMetaTitle(html);
    const body = extractBody(html);
    const clean = htmlToText(body).slice(0, 12000);
    if (clean.length < 50) return null;
    if (title === "Google Search" || clean.includes("redirected within")) return null;
    return title ? `# ${title} [cached]\n\n${clean}` : clean;
  } catch {
    return null;
  }
}

async function fetchViaTextise(url: string): Promise<string | null> {
  const proxies = [
    `https://r.jina.ai/http://${encodeURIComponent(url.replace(/^https?:\/\//, ""))}`,
  ];
  for (const proxyUrl of proxies) {
    try {
      const res = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(15000),
        headers: {
          Accept: "text/plain, text/markdown, */*",
          "X-Return-Format": "markdown",
          "X-With-Images-Summary": "false",
          "X-With-Generated-Alt": "false",
        },
      });
      if (!res.ok) continue;
      const text = await res.text();
      if (text.length > 100 && !isCloudflareChallenge(text)) return text.slice(0, 15000);
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchViaFirecrawl(url: string): Promise<string | null> {
  const key = process.env.MUNCH_FIRECRAWL_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      signal: AbortSignal.timeout(25000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        timeout: 20000,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    if (data.success) {
      const md = (data.data as Record<string, unknown>)?.markdown as string ?? "";
      if (md.length > 50 && !isCloudflareChallenge(md)) return md.slice(0, 15000);
    }
    return null;
  } catch {
    return null;
  }
}

// ── Tool: web_scrape — multi-strategy ────────────────────

async function scrapeUrl(url: string): Promise<string> {
  // Strategy 1: Direct fetch with rotating user agents
  const errors: string[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const html = await fetchText(url, {
        headers: realisticHeaders(),
        timeout: 10000,
      });
      const title = extractMetaTitle(html);
      const body = extractBody(html);
      const text = htmlToText(body).slice(0, 8000);
      if (text.length > 50 && !isCloudflareChallenge(text)) {
        return title ? `# ${title}\n\n${text}` : text;
      }
      errors.push(`attempt ${attempt + 1}: empty body`);
    } catch (e) {
      const msg = (e as Error).message;
      errors.push(`attempt ${attempt + 1}: ${msg}`);
      if (msg.includes("403") || msg.includes("429") || msg.includes("503") || msg.includes("Cloudflare")) {
        break; // blocked — try proxies
      }
    }
  }

  // Strategy 2: Google Cache (free, works for most indexed/blocked pages)
  const cacheResult = await fetchViaGoogleCache(url);
  if (cacheResult) return cacheResult;
  errors.push("Google Cache: failed or not indexed");

  // Strategy 3: Textise proxy (free, bypasses some Cloudflare)
  const textiseResult = await fetchViaTextise(url);
  if (textiseResult) return textiseResult;
  errors.push("Textise: failed");

  // Strategy 4: Jina Reader (free, bypasses Cloudflare & JS challenges)
  const jinaResult = await fetchViaJinaReader(url);
  if (jinaResult) return jinaResult;
  errors.push("Jina Reader: failed");

  // Strategy 5: ScrapingBee (if configured)
  const beeResult = await fetchViaScrapingBee(url);
  if (beeResult) return beeResult;
  errors.push("ScrapingBee: not configured or failed");

  // Strategy 6: ScraperAPI (if configured)
  const apiResult = await fetchViaScraperAPI(url);
  if (apiResult) return apiResult;
  errors.push("ScraperAPI: not configured or failed");

  // Strategy 7: Firecrawl (if configured)
  const fireResult = await fetchViaFirecrawl(url);
  if (fireResult) return fireResult;
  errors.push("Firecrawl: not configured or failed");

  throw new Error(
    `All scraping strategies failed.\n${errors.map((e) => `  - ${e}`).join("\n")}\n\n` +
    "For Cloudflare-protected sites, deploy the Cloudflare Worker (see browser-worker/README.md).",
  );
}

function isCloudflareChallenge(text: string): boolean {
  return text.includes("Just a moment") && (text.includes("security verification") || text.includes("checking your browser") || text.includes("Please stand by") || text.includes("DDoS protection") || text.includes("Enable JavaScript") || text.includes("challenge-platform") || text.includes("cf_chl_opt"));
}

// ── Browser Testing Tools ─────────────────────────────

interface ConsoleEntry {
  type: string;
  text: string;
  timestamp: number;
}

interface BrowserTestResult {
  title: string;
  html: string;
  text: string;
  consoleLogs: ConsoleEntry[];
  screenshotBase64: string;
  timingMs: number;
  errors: string[];
}

type InteractionAction = {
  type: "click" | "type" | "select" | "scroll" | "wait" | "screenshot";
  selector?: string;
  value?: string;
  ms?: number;
};

async function tryPuppeteer<T>(fn: (puppeteer: any, chromePath: string) => Promise<T>): Promise<T | null> {
  const chromePath = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || detectChrome();
  if (!chromePath) return null;
  try {
    const puppeteerCore = await Function('return import("puppeteer-core")')();
    return await fn(puppeteerCore, chromePath);
  } catch {
    return null;
  }
}

async function browserTestPage(url: string, options?: {
  waitUntil?: "load" | "domcontentloaded" | "networkidle0" | "networkidle2";
  timeout?: number;
}): Promise<BrowserTestResult> {
  const result: BrowserTestResult = {
    title: "",
    html: "",
    text: "",
    consoleLogs: [],
    screenshotBase64: "",
    timingMs: 0,
    errors: [],
  };

  const puppeteerResult = await tryPuppeteer(async (puppeteerCore, chromePath) => {
    const browser = await puppeteerCore.launch({
      headless: true,
      executablePath: chromePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });
    try {
      const page = await browser.newPage();
      const consoleLogs: ConsoleEntry[] = [];
      page.on("console", (msg: any) => {
        consoleLogs.push({
          type: msg.type(),
          text: msg.text(),
          timestamp: Date.now(),
        });
      });
      page.on("pageerror", (err: Error) => {
        result.errors.push(`pageerror: ${err.message}`);
      });

      const t0 = performance.now();
      const waitUntil = options?.waitUntil ?? "networkidle2";
      await page.goto(url, { waitUntil, timeout: options?.timeout ?? 30000 });
      await new Promise((r) => setTimeout(r, 1000));
      const timingMs = Math.round(performance.now() - t0);

      const title = await page.title();
      const html = await page.content();
      const screenshotBase64 = await page.screenshot({ encoding: "base64", type: "jpeg", quality: 80 });
      const bodyText = await page.evaluate(() => {
        const clone = document.body.cloneNode(true) as HTMLElement;
        const removals = clone.querySelectorAll("script,style,nav,footer,header,iframe");
        removals.forEach((el) => el.remove());
        return (clone.textContent ?? "").replace(/\s+/g, " ").slice(0, 20000);
      });

      return {
        title,
        html: html.slice(0, 15000),
        text: bodyText.trim(),
        consoleLogs,
        screenshotBase64: `data:image/jpeg;base64,${screenshotBase64}`,
        timingMs,
        errors: result.errors,
      };
    } finally {
      await browser.close().catch(() => {});
    }
  });

  if (puppeteerResult) return puppeteerResult;
  result.errors.push("puppeteer-core not available, falling back to fetch");

  // Fallback: direct fetch
  try {
    const t0 = performance.now();
    const text = await browserScrape(url);
    const timingMs = Math.round(performance.now() - t0);
    return {
      ...result,
      text,
      html: text,
      timingMs,
    };
  } catch (e) {
    result.errors.push(`fetch fallback: ${(e as Error).message}`);
  }

  return result;
}

async function browserInteract(
  url: string,
  actions: InteractionAction[],
): Promise<BrowserTestResult> {
  const result: BrowserTestResult = {
    title: "",
    html: "",
    text: "",
    consoleLogs: [],
    screenshotBase64: "",
    timingMs: 0,
    errors: [],
  };

  const puppeteerResult = await tryPuppeteer(async (puppeteerCore, chromePath) => {
    const browser = await puppeteerCore.launch({
      headless: true,
      executablePath: chromePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });
    try {
      const page = await browser.newPage();
      const consoleLogs: ConsoleEntry[] = [];
      page.on("console", (msg: any) => {
        consoleLogs.push({
          type: msg.type(),
          text: msg.text(),
          timestamp: Date.now(),
        });
      });
      page.on("pageerror", (err: Error) => {
        result.errors.push(`pageerror: ${err.message}`);
      });

      const t0 = performance.now();
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        try {
          switch (action.type) {
            case "click":
              if (!action.selector) { result.errors.push(`action ${i}: click missing selector`); break; }
              await page.waitForSelector(action.selector, { timeout: 5000 });
              await page.click(action.selector);
              break;

            case "type":
              if (!action.selector) { result.errors.push(`action ${i}: type missing selector`); break; }
              await page.waitForSelector(action.selector, { timeout: 5000 });
              await page.click(action.selector);
              await page.type(action.selector, action.value ?? "", { delay: 30 });
              break;

            case "select":
              if (!action.selector) { result.errors.push(`action ${i}: select missing selector`); break; }
              await page.waitForSelector(action.selector, { timeout: 5000 });
              await page.select(action.selector, action.value ?? "");
              break;

            case "scroll":
              if (action.selector) {
                await page.waitForSelector(action.selector, { timeout: 5000 });
                await page.$eval(action.selector, (el: any) => el.scrollIntoView({ behavior: "smooth" }));
              } else {
                await page.evaluate((y: number) => window.scrollTo(0, y), action.value ? parseInt(action.value) : 500);
              }
              break;

            case "wait":
              await new Promise((r) => setTimeout(r, action.ms ?? 1000));
              break;

            case "screenshot":
              // Capture screenshot at this point
              break;
          }
        } catch (e) {
          result.errors.push(`action ${i} (${action.type}): ${(e as Error).message}`);
        }
      }

      await new Promise((r) => setTimeout(r, 500));
      const timingMs = Math.round(performance.now() - t0);
      const title = await page.title();
      const html = await page.content();
      const screenshotBase64 = await page.screenshot({ encoding: "base64", type: "jpeg", quality: 80 });
      const bodyText = await page.evaluate(() => {
        const clone = document.body.cloneNode(true) as HTMLElement;
        const removals = clone.querySelectorAll("script,style,nav,footer,header,iframe");
        removals.forEach((el) => el.remove());
        return (clone.textContent ?? "").replace(/\s+/g, " ").slice(0, 20000);
      });

      return {
        title,
        html: html.slice(0, 15000),
        text: bodyText.trim(),
        consoleLogs,
        screenshotBase64: `data:image/jpeg;base64,${screenshotBase64}`,
        timingMs,
        errors: result.errors,
      };
    } finally {
      await browser.close().catch(() => {});
    }
  });

  if (puppeteerResult) return puppeteerResult;
  result.errors.push("puppeteer-core not available; browser_interact requires a local browser");
  return result;
}

// ── Registration ─────────────────────────────────────────

export function registerWebTools(server: McpServer): void {
  // ── web_search ────────────────────────────
  server.registerTool(
    "web_search",
    {
      description:
        "Search the web using DuckDuckGo. Returns title, URL, and snippet for each result. " +
        "Use this for general web searches, finding documentation, current events, etc.",
      inputSchema: {
        query: z
          .string()
          .describe("Search query"),
        count: z
          .number()
          .optional()
          .default(8)
          .describe("Number of results (1-20)"),
      },
    },
    async ({ query, count }: { query: string; count?: number }) => {
      try {
        const results = await searchDuckDuckGo(query);
        const limit = Math.min(count ?? 8, results.length, 20);
        if (results.length === 0) {
          return { content: [{ type: "text" as const, text: "No results found." }] };
        }
        const lines = results
          .slice(0, limit)
          .map(
            (r, i) =>
              `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}`,
          );
        return { content: [{ type: "text" as const, text: lines.join("\n\n") }] };
      } catch (e) {
        return {
          content: [
            {
              type: "text" as const,
              text: `web_search error: ${(e as Error).message}`,
            },
          ],
        };
      }
    },
  );

  // ── web_scrape ────────────────────────────
  server.registerTool(
    "web_scrape",
    {
      description:
        "Fetch a URL and extract readable text content. " +
        "Bypasses robots.txt, Cloudflare, and anti-bot protections " +
        "using a multi-strategy approach: direct fetch → Jina Reader (free proxy) → " +
        "ScrapingBee → ScraperAPI. Handles static sites, JS-rendered content, " +
        "and Cloudflare-challenged pages. For the hardest sites, use browser_scrape.",
      inputSchema: {
        url: z.string().url().describe("URL to scrape"),
      },
    },
    async ({ url }: { url: string }) => {
      try {
        const text = await scrapeUrl(url);
        return {
          content: [{ type: "text" as const, text }],
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text" as const,
              text: `web_scrape error: ${(e as Error).message}`,
            },
          ],
        };
      }
    },
  );

  // ── github_search ─────────────────────────
  server.registerTool(
    "github_search",
    {
      description:
        "Search GitHub repositories, code, issues, or users. " +
        "Rate limit: 60 req/hr unauthenticated, 5000 req/hr with GITHUB_TOKEN env.",
      inputSchema: {
        query: z.string().describe("Search query"),
        type: z
          .enum(["repositories", "code", "issues", "users"])
          .optional()
          .default("repositories")
          .describe("Type of search"),
        token: z
          .string()
          .optional()
          .describe("Optional GitHub token (overrides GITHUB_TOKEN env)"),
      },
    },
    async ({
      query,
      type,
      token,
    }: {
      query: string;
      type?: string;
      token?: string;
    }) => {
      const oldToken = process.env.GITHUB_TOKEN;
      if (token) process.env.GITHUB_TOKEN = token;
      try {
        const text = await searchGitHub(query, type ?? "repositories");
        return { content: [{ type: "text" as const, text }] };
      } catch (e) {
        return {
          content: [
            {
              type: "text" as const,
              text: `github_search error: ${(e as Error).message}`,
            },
          ],
        };
      } finally {
        if (token) process.env.GITHUB_TOKEN = oldToken;
      }
    },
  );

  // ── youtube_search ────────────────────────
  server.registerTool(
    "youtube_search",
    {
      description:
        "Search YouTube videos by query. Returns video title, channel, " +
        "duration, views, and watch URL.",
      inputSchema: {
        query: z.string().describe("Search query"),
      },
    },
    async ({ query }: { query: string }) => {
      try {
        const text = await searchYouTube(query);
        return { content: [{ type: "text" as const, text }] };
      } catch (e) {
        return {
          content: [
            {
              type: "text" as const,
              text: `youtube_search error: ${(e as Error).message}`,
            },
          ],
        };
      }
    },
  );

  // ── wikipedia_search ──────────────────────
  server.registerTool(
    "wikipedia_search",
    {
      description:
        "Search Wikipedia articles in any language. " +
        "Returns article titles, URLs, and content snippets.",
      inputSchema: {
        query: z.string().describe("Search query"),
        language: z
          .string()
          .optional()
          .default("en")
          .describe("Wikipedia language code (en, de, fr, ja, etc.)"),
      },
    },
    async ({
      query,
      language,
    }: {
      query: string;
      language?: string;
    }) => {
      try {
        const text = await searchWikipedia(query, language ?? "en");
        return { content: [{ type: "text" as const, text }] };
      } catch (e) {
        return {
          content: [
            {
              type: "text" as const,
              text: `wikipedia_search error: ${(e as Error).message}`,
            },
          ],
        };
      }
    },
  );

  // ── twitter_search ────────────────────────
  server.registerTool(
    "twitter_search",
    {
      description:
        "Search X/Twitter for tweets matching a query. " +
        "Uses nitter.net (privacy frontend) or syndication API as fallback. " +
        "May have limited availability if nitter is blocked.",
      inputSchema: {
        query: z.string().describe("Search query"),
        count: z
          .number()
          .optional()
          .default(10)
          .describe("Number of tweets (max 20)"),
      },
    },
    async ({ query }: { query: string }) => {
      try {
        const text = await searchTwitter(query);
        return { content: [{ type: "text" as const, text }] };
      } catch (e) {
        return {
          content: [
            {
              type: "text" as const,
              text: `twitter_search error: ${(e as Error).message}`,
            },
          ],
        };
      }
    },
  );

  // ── tiktok_search ─────────────────────────
  server.registerTool(
    "tiktok_search",
    {
      description:
        "Search TikTok for videos matching a query. " +
        "TikTok has aggressive anti-scraping; results may be limited. " +
        "For best results, use browser_scrape with puppeteer installed.",
      inputSchema: {
        query: z.string().describe("Search query"),
        count: z
          .number()
          .optional()
          .default(10)
          .describe("Number of results (max 20)"),
      },
    },
    async ({ query }: { query: string }) => {
      try {
        const text = await searchTikTok(query);
        return { content: [{ type: "text" as const, text }] };
      } catch (e) {
        return {
          content: [
            {
              type: "text" as const,
              text: `tiktok_search error: ${(e as Error).message}`,
            },
          ],
        };
      }
    },
  );

  // ── gmail_search ──────────────────────────
  server.registerTool(
    "gmail_search",
    {
      description:
        "Search Gmail messages. Requires Google OAuth setup:\n" +
        "1. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars\n" +
        "2. Run gmail_authorize to get the OAuth URL\n" +
        "3. Visit the URL, authorize, then run gmail_authorize with the code\n" +
        "Tokens are cached in ~/.munchmemory/google-oauth.json",
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe("Gmail search query (same as Gmail search syntax)"),
        maxResults: z
          .number()
          .optional()
          .default(5)
          .describe("Maximum messages to return (1-20)"),
      },
    },
    async ({
      query,
      maxResults,
    }: {
      query?: string;
      maxResults?: number;
    }) => {
      try {
        const text = await searchGmail(query, Math.min(maxResults ?? 5, 20));
        return { content: [{ type: "text" as const, text }] };
      } catch (e) {
        return {
          content: [
            {
              type: "text" as const,
              text: `gmail_search error: ${(e as Error).message}`,
            },
          ],
        };
      }
    },
  );

  // ── gmail_authorize ───────────────────────
  server.registerTool(
    "gmail_authorize",
    {
      description:
        "Authorize Gmail access via Google OAuth. " +
        "Without arguments: prints the authorization URL. " +
        "With a code argument: exchanges the code for tokens and saves them.",
      inputSchema: {
        code: z
          .string()
          .optional()
          .describe("Authorization code from the OAuth callback URL"),
      },
    },
    async ({ code }: { code?: string }) => {
      try {
        const urls = getGoogleOAuthUrls();
        if (!urls.clientId) {
          return {
            content: [
              {
                type: "text" as const,
                text:
                  "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables first.",
              },
            ],
          };
        }

        let state = loadGoogleOAuth();
        if (!state) {
          state = {
            clientId: urls.clientId,
            clientSecret: urls.clientSecret,
          };
        }
        state.clientId = urls.clientId;
        state.clientSecret = urls.clientSecret;

        if (!code) {
          state.redirectUri = urls.redirectUri;
          saveGoogleOAuth(state);
          return {
            content: [
              {
                type: "text" as const,
                text:
                  `Visit this URL to authorize Gmail/Drive access:\n\n${getGoogleAuthUrl(state)}\n\n` +
                  `After authorizing, you'll be redirected to ${urls.redirectUri}?code=...\n` +
                  `Copy the 'code' parameter and run gmail_authorize with it.`,
              },
            ],
          };
        }

        state.redirectUri = urls.redirectUri;
        await exchangeGoogleCode(code, state);
        return {
          content: [
            {
              type: "text" as const,
              text:
                "✓ Google OAuth authorized successfully!\n" +
                "Gmail and Drive tools are now ready to use.",
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text" as const,
              text: `gmail_authorize error: ${(e as Error).message}`,
            },
          ],
        };
      }
    },
  );

  // ── drive_search ──────────────────────────
  server.registerTool(
    "drive_search",
    {
      description:
        "Search Google Drive files. Shares OAuth with gmail_search — " +
        "authorize once via gmail_authorize, then both tools work.",
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe("Drive search query"),
        maxResults: z
          .number()
          .optional()
          .default(10)
          .describe("Maximum files to return (1-50)"),
      },
    },
    async ({
      query,
      maxResults,
    }: {
      query?: string;
      maxResults?: number;
    }) => {
      try {
        const text = await searchDrive(query, Math.min(maxResults ?? 10, 50));
        return { content: [{ type: "text" as const, text }] };
      } catch (e) {
        return {
          content: [
            {
              type: "text" as const,
              text: `drive_search error: ${(e as Error).message}`,
            },
          ],
        };
      }
    },
  );

  // ── browser_scrape ────────────────────────
  server.registerTool(
    "browser_scrape",
    {
      description:
        "Scrape a website using a headless browser (puppeteer-extra with stealth plugin). " +
        "Bypasses Cloudflare, JavaScript challenges, and anti-bot protections. " +
        "On desktop: uses puppeteer-extra with stealth. On serverless (Vercel): " +
        "falls back to proxy services automatically. No setup required — works " +
        "out of the box via the remote MCP endpoint.",
      inputSchema: {
        url: z.string().url().describe("URL to scrape with browser"),
      },
    },
    async ({ url }: { url: string }) => {
      try {
        const text = await browserScrape(url);
        return { content: [{ type: "text" as const, text }] };
      } catch (e) {
        return {
          content: [
            {
              type: "text" as const,
              text: `browser_scrape error: ${(e as Error).message}`,
            },
          ],
        };
      }
    },
  );

  // ── browser_test_page ─────────────────────
  server.registerTool(
    "browser_test_page",
    {
      description:
        "Open a URL in a headless browser and return test results: console logs, " +
        "HTML, extracted text, screenshot (base64 JPEG), page load timing, and errors. " +
        "Uses Puppeteer with local Chrome when available (stdio/local mode), falls back " +
        "to fetch-based scraping on remote (Vercel). Critical for QA: captures JS errors, " +
        "React warnings, missing elements, and blank-page detection.",
      inputSchema: {
        url: z.string().url().describe("URL to test in the browser"),
        waitUntil: z
          .enum(["load", "domcontentloaded", "networkidle0", "networkidle2"])
          .optional()
          .default("networkidle2")
          .describe("When to consider navigation complete"),
        timeout: z
          .number()
          .optional()
          .default(30000)
          .describe("Navigation timeout in milliseconds"),
      },
    },
    async ({ url, waitUntil, timeout }: { url: string; waitUntil?: string; timeout?: number }) => {
      try {
        const result = await browserTestPage(url, { waitUntil: waitUntil as any, timeout });
        const lines: string[] = [];
        lines.push(`# Browser Test: ${url}`);
        lines.push(`Timing: ${result.timingMs}ms`);
        lines.push(`Title: ${result.title}`);
        lines.push("");

        if (result.consoleLogs.length > 0) {
          lines.push("");
          lines.push(`## Console Logs (${result.consoleLogs.length})`);
          const errors = result.consoleLogs.filter((l) => l.type === "error");
          const warnings = result.consoleLogs.filter((l) => l.type === "warning");
          if (errors.length > 0) lines.push(`\n### ❌ Errors (${errors.length})`);
          errors.forEach((l) => lines.push(`  ${l.text}`));
          if (warnings.length > 0) lines.push(`\n### ⚠️ Warnings (${warnings.length})`);
          warnings.forEach((l) => lines.push(`  ${l.text}`));
          const others = result.consoleLogs.filter((l) => l.type !== "error" && l.type !== "warning");
          others.slice(0, 20).forEach((l) => lines.push(`  [${l.type}] ${l.text}`));
          if (others.length > 20) lines.push(`  ... and ${others.length - 20} more`);
        }

        if (result.errors.length > 0) {
          lines.push("");
          lines.push("## Errors");
          result.errors.forEach((e) => lines.push(`  ❌ ${e}`));
        }

        lines.push("");
        lines.push("## Page Content");
        lines.push(result.text.slice(0, 3000));

        if (result.screenshotBase64) {
          lines.push("");
          lines.push("## Screenshot");
          lines.push(result.screenshotBase64);
        }

        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (e) {
        return {
          content: [
            {
              type: "text" as const,
              text: `browser_test_page error: ${(e as Error).message}`,
            },
          ],
        };
      }
    },
  );

  // ── browser_interact ──────────────────────
  server.registerTool(
    "browser_interact",
    {
      description:
        "Open a URL and perform a sequence of actions (click, type, select, scroll, wait) " +
        "in a real browser. Returns final page state including console logs and screenshot. " +
        "Use this to test form submissions, navigation flows, button clicks, and dynamic content. " +
        "Requires Puppeteer with local Chrome — only works in stdio/local mode, not on Vercel.",
      inputSchema: {
        url: z.string().url().describe("URL to open"),
        actions: z.array(z.object({
          type: z.enum(["click", "type", "select", "scroll", "wait", "screenshot"]),
          selector: z.string().optional().describe("CSS selector for click/type/select/scroll-to"),
          value: z.string().optional().describe("Text to type or option value for select"),
          ms: z.number().optional().describe("Milliseconds to wait (for wait action)"),
        })).min(1).describe("Sequence of interactions to perform"),
      },
    },
    async ({ url, actions }: { url: string; actions: InteractionAction[] }) => {
      try {
        const result = await browserInteract(url, actions);
        const lines: string[] = [];
        lines.push(`# Browser Interaction: ${url}`);
        lines.push(`Actions: ${actions.length}`);
        lines.push(`Timing: ${result.timingMs}ms`);
        lines.push(`Title: ${result.title}`);

        if (result.consoleLogs.length > 0) {
          lines.push("");
          lines.push(`## Console Logs (${result.consoleLogs.length})`);
          const errors = result.consoleLogs.filter((l) => l.type === "error");
          const warnings = result.consoleLogs.filter((l) => l.type === "warning");
          if (errors.length > 0) lines.push(`\n### ❌ Errors (${errors.length})`);
          errors.forEach((l) => lines.push(`  ${l.text}`));
          if (warnings.length > 0) lines.push(`\n### ⚠️ Warnings (${warnings.length})`);
          warnings.forEach((l) => lines.push(`  ${l.text}`));
        }

        if (result.errors.length > 0) {
          lines.push("");
          lines.push("## Errors");
          result.errors.forEach((e) => lines.push(`  ❌ ${e}`));
        }

        lines.push("");
        lines.push("## Page Content");
        lines.push(result.text.slice(0, 3000));

        if (result.screenshotBase64) {
          lines.push("");
          lines.push("## Screenshot");
          lines.push(result.screenshotBase64);
        }

        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (e) {
        return {
          content: [
            {
              type: "text" as const,
              text: `browser_interact error: ${(e as Error).message}`,
            },
          ],
        };
      }
    },
  );
}
