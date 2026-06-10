#!/usr/bin/env node
/**
 * munch Browser Test Runner v1.0
 * Standalone script that opens a URL in a headless browser, captures console logs,
 * screenshots, HTML, and reports errors. Designed to be called by the AI agent
 * during the BTL TEST phase.
 *
 * Usage:
 *   node scripts/browser-test.mjs <url>
 *   node scripts/browser-test.mjs <url> [actions.json]
 *   node scripts/browser-test.mjs --help
 *
 * Actions JSON format:
 *   [{"type":"click","selector":"#btn"},{"type":"type","selector":"#input","value":"hello"},{"type":"wait","ms":2000}]
 *
 * Output: JSON to stdout with { success, title, consoleLogs, errors, timingMs, screenshotBase64, html }
 */

import { launch } from "puppeteer-core";
import { existsSync } from "fs";
import process from "process";

const CHROME_PATHS = [
  process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || "",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ...(process.env.LOCALAPPDATA ? [`${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`] : []),
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
];

function findChrome() {
  for (const p of CHROME_PATHS) {
    if (p && existsSync(p)) return p;
  }
  return null;
}

function parseActions(raw) {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    console.error(`Invalid actions JSON: ${raw}`);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
Usage:
  node scripts/browser-test.mjs <url> [actions.json]
  node scripts/browser-test.mjs --help

Arguments:
  url             URL to test (required)
  actions.json    Optional JSON array of interactions

Actions:
  {"type":"click","selector":"#btn"}
  {"type":"type","selector":"#input","value":"hello"}
  {"type":"select","selector":"#select","value":"option1"}
  {"type":"scroll","selector":"#target"}          (scroll to element)
  {"type":"scroll","value":"500"}                  (scroll to Y position)
  {"type":"wait","ms":2000}
  {"type":"screenshot"}

Environment:
  CHROME_PATH           Path to Chrome/Chromium executable
  PUPPETEER_EXECUTABLE_PATH  Alternative Chrome path
  BROWSER_TEST_TIMEOUT  Navigation timeout in ms (default: 30000)
`);
  process.exit(0);
}

async function run() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printHelp();
  }

  const url = args[0];
  const actions = parseActions(args[1]);

  const chromePath = findChrome();
  if (!chromePath) {
    console.log(JSON.stringify({
      success: false,
      error: "No Chrome/Chromium executable found. Set CHROME_PATH env var or install Chrome.",
    }));
    process.exit(1);
  }

  const timeout = parseInt(process.env.BROWSER_TEST_TIMEOUT || "30000", 10);

  const consoleLogs = [];
  const pageErrors = [];

  let browser;
  try {
    browser = await launch({
      headless: true,
      executablePath: chromePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });

    const page = await browser.newPage();

    page.on("console", (msg) => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now(),
      });
    });

    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    page.on("response", (resp) => {
      if (!resp.ok()) {
        consoleLogs.push({
          type: "error",
          text: `HTTP ${resp.status()} ${resp.url()}`,
          timestamp: Date.now(),
        });
      }
    });

    const t0 = performance.now();
    await page.goto(url, { waitUntil: "networkidle2", timeout });
    await new Promise((r) => setTimeout(r, 1000));
    const timingMs = Math.round(performance.now() - t0);

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      try {
        switch (action.type) {
          case "click":
            if (!action.selector) throw new Error("click missing selector");
            await page.waitForSelector(action.selector, { timeout: 5000 });
            await page.click(action.selector);
            break;

          case "type":
            if (!action.selector) throw new Error("type missing selector");
            await page.waitForSelector(action.selector, { timeout: 5000 });
            await page.click(action.selector);
            await page.type(action.selector, action.value || "", { delay: 30 });
            break;

          case "select":
            if (!action.selector) throw new Error("select missing selector");
            await page.waitForSelector(action.selector, { timeout: 5000 });
            await page.select(action.selector, action.value || "");
            break;

          case "scroll":
            if (action.selector) {
              await page.waitForSelector(action.selector, { timeout: 5000 });
              await page.$eval(action.selector, (el) => el.scrollIntoView({ behavior: "smooth" }));
            } else {
              await page.evaluate((y) => window.scrollTo(0, y), parseInt(action.value || "500"));
            }
            break;

          case "wait":
            await new Promise((r) => setTimeout(r, action.ms || 1000));
            break;

          case "screenshot":
            break;
        }
      } catch (e) {
        consoleLogs.push({
          type: "error",
          text: `Action ${i} (${action.type}): ${e.message}`,
          timestamp: Date.now(),
        });
      }
    }

    await new Promise((r) => setTimeout(r, 500));
    const title = await page.title();
    const html = await page.content();
    const screenshotBase64 = await page.screenshot({ encoding: "base64", type: "jpeg", quality: 80 });
    const bodyText = await page.evaluate(() => {
      const clone = document.body.cloneNode(true);
      const removals = clone.querySelectorAll("script,style,nav,footer,header,iframe");
      removals.forEach((el) => el.remove());
      return (clone.textContent || "").replace(/\s+/g, " ").slice(0, 20000);
    });

    console.log(JSON.stringify({
      success: pageErrors.length === 0,
      title,
      url,
      timingMs,
      htmlLength: html.length,
      textLength: bodyText.trim().length,
      consoleLogs,
      pageErrors,
      screenshotBase64: `data:image/jpeg;base64,${screenshotBase64}`,
    }));
  } catch (e) {
    console.log(JSON.stringify({
      success: false,
      error: e.message,
      url,
      consoleLogs,
      pageErrors,
    }));
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

run();
