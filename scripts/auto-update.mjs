#!/usr/bin/env node
/**
 * munch Auto-Updater v2.0
 *
 * Compares the latest commit SHA on the configured GitHub branch against the
 * stored SHA. In auto-update mode (default), it downloads and applies the
 * update silently. In notify-only mode (--notify), it writes a flag file and
 * shows a desktop notification instead.
 *
 * Designed to run as a silent scheduled task — no output unless --verbose.
 *
 * Environment:
 *   MUNCH_INSTALL_DIR    Override install directory (default: %LOCALAPPDATA%\Programs\Munch)
 *   MUNCH_GITHUB_REPO    GitHub repo (default: WyvernCW/MunchsPlugin)
 *   MUNCH_BRANCH         Branch to follow (default: main)
 *   MUNCH_VERBOSE        Set to "true" for detailed logging
 */

import { execSync, spawnSync } from "child_process";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  cpSync,
} from "fs";
import { join, dirname, resolve } from "path";
import https from "https";

const NOTIFY_ONLY = process.argv.includes("--notify");
const INSTALL_DIR = resolve(
  process.env.MUNCH_INSTALL_DIR
    || (process.platform === "win32"
      ? join(process.env.LOCALAPPDATA, "Programs", "Munch")
      : join(process.env.HOME, ".local", "share", "munch"))
);
const LAST_COMMIT_FILE = join(INSTALL_DIR, ".last-commit");
const UPDATE_AVAILABLE_FILE = join(INSTALL_DIR, ".update-available");
const UPDATE_LOG = join(INSTALL_DIR, "updates.log");
const GITHUB_REPO = process.env.MUNCH_GITHUB_REPO || "WyvernCW/MunchsPlugin";
const BRANCH = process.env.MUNCH_BRANCH || "main";
const VERBOSE = process.env.MUNCH_VERBOSE === "true";

const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}`;

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  if (VERBOSE) console.log(line);
  try {
    const dir = dirname(UPDATE_LOG);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(UPDATE_LOG, line + "\n", { flag: "as" });
  } catch { /* log write failed silently */ }
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "munch-auto-update", Accept: "application/vnd.github.v3+json" } }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            if (res.statusCode === 403 && data.includes("rate limit")) {
              reject(new Error("GitHub API rate limited. Try again later."));
            } else {
              resolve(JSON.parse(data));
            }
          } catch {
            reject(new Error(`Failed to parse response: ${data.slice(0, 200)}`));
          }
        });
      })
      .on("error", reject);
  });
}

function readLastCommit() {
  try {
    return readFileSync(LAST_COMMIT_FILE, "utf-8").trim();
  } catch {
    return null;
  }
}

function writeLastCommit(sha) {
  const dir = dirname(LAST_COMMIT_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(LAST_COMMIT_FILE, sha);
}

function readFileVersion() {
  try {
    const pkg = JSON.parse(readFileSync(join(INSTALL_DIR, "package.json"), "utf-8"));
    return pkg.version;
  } catch {
    return "0.0.0";
  }
}

function run(cmd, opts = {}) {
  const defaultOpts = { cwd: INSTALL_DIR, stdio: VERBOSE ? "inherit" : "pipe", timeout: 120000 };
  try {
    execSync(cmd, { ...defaultOpts, ...opts });
    return true;
  } catch (e) {
    log(`Command failed: ${cmd} — ${e.message}`);
    return false;
  }
}

async function getLatestCommitSha() {
  const data = await fetchJSON(`${GITHUB_API}/branches/${BRANCH}`);
  if (!data || !data.commit || !data.commit.sha) {
    throw new Error(`Could not get latest commit SHA for ${GITHUB_REPO}/${BRANCH}`);
  }
  return data.commit.sha;
}

async function downloadAndExtract() {
  const zipUrl = `${GITHUB_API}/zipball/${BRANCH}`;
  const zipPath = join(INSTALL_DIR, ".update.zip");
  const extractDir = join(INSTALL_DIR, ".update.extract");

  log(`Downloading ${zipUrl}...`);
  await new Promise((resolve, reject) => {
    const file = require("fs").createWriteStream(zipPath);
    https
      .get(zipUrl, { headers: { "User-Agent": "munch-auto-update" } }, (res) => {
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", (e) => {
        file.close();
        rmSync(zipPath, { force: true });
        reject(e);
      });
  });

  if (!existsSync(zipPath)) {
    throw new Error("Download failed — zip not created");
  }

  // Extract zip (the zip contains a single root dir like WyvernCW-MunchsPlugin-<sha>/)
  if (existsSync(extractDir)) rmSync(extractDir, { recursive: true, force: true });
  mkdirSync(extractDir, { recursive: true });

  // Use tar (Node 20+ has built-in support) or fall back to PowerShell
  if (process.platform === "win32") {
    run(`powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`);
  } else {
    run(`unzip -o "${zipPath}" -d "${extractDir}"`);
  }

  // Find the root dir inside the zip
  const entries = require("fs").readdirSync(extractDir);
  if (entries.length === 0) throw new Error("Empty extract directory");
  const repoRoot = join(extractDir, entries[0]);

  if (!existsSync(repoRoot)) {
    throw new Error(`Extracted root not found at ${repoRoot}`);
  }

  return { zipPath, extractDir, repoRoot };
}

function replaceFiles(repoRoot) {
  log("Replacing files...");

  const preserve = new Set(["node_modules", ".munchmemory", "updates.log", ".last-commit", ".update.zip", ".update.extract"]);

  // Remove all files/dirs in install dir except preserved ones
  const entries = require("fs").readdirSync(INSTALL_DIR);
  for (const entry of entries) {
    if (preserve.has(entry)) continue;
    const fullPath = join(INSTALL_DIR, entry);
    rmSync(fullPath, { recursive: true, force: true });
  }

  // Copy everything from repo to install dir (except .git, node_modules)
  const copyEntries = require("fs").readdirSync(repoRoot);
  for (const entry of copyEntries) {
    if (entry === ".git" || entry === "node_modules") continue;
    const src = join(repoRoot, entry);
    const dst = join(INSTALL_DIR, entry);
    if (existsSync(src)) {
      cpSync(src, dst, { recursive: true, force: true });
    }
  }

  log("Files replaced.");
}

function needsNpmCi() {
  return (
    !existsSync(join(INSTALL_DIR, "node_modules")) ||
    !existsSync(join(INSTALL_DIR, "mcp-server", "node_modules"))
  );
}

function showNotification(message) {
  if (process.platform !== "win32") {
    log(`Notification: ${message}`);
    return;
  }
  try {
    const ps = `
Add-Type -AssemblyName System.Windows.Forms;
[System.Windows.Forms.MessageBox]::Show('${message.replace(/'/g, "''")}', 'Munch Update Available', 'OK', 'Information')
`;
    spawnSync("powershell", ["-NoProfile", "-Command", ps], { timeout: 10000 });
  } catch (e) {
    log(`Notification failed: ${e.message}`);
  }
}

async function main() {
  log(`=== Munch Auto-Update Check ===`);
  log(`Install dir: ${INSTALL_DIR}`);
  log(`Version: ${readFileVersion()}`);

  if (!existsSync(INSTALL_DIR)) {
    log(`Install directory does not exist: ${INSTALL_DIR}. Skipping.`);
    return;
  }

  try {
    const latestSha = await getLatestCommitSha();
    const lastSha = readLastCommit();

    log(`Latest commit: ${latestSha}`);
    log(`Last update:   ${lastSha || "(never)"}`);

    if (lastSha && latestSha === lastSha) {
      log("Already up to date.");
      if (NOTIFY_ONLY && existsSync(UPDATE_AVAILABLE_FILE)) {
        rmSync(UPDATE_AVAILABLE_FILE, { force: true });
      }
      return;
    }

    if (NOTIFY_ONLY) {
      log("Change detected (notify mode). Writing flag file...");
      writeFileSync(UPDATE_AVAILABLE_FILE, JSON.stringify({
        sha: latestSha,
        detectedAt: new Date().toISOString(),
      }));
      showNotification(`A new version of Munch is available.\nCommit: ${latestSha.slice(0, 7)}`);
      log(`Update available: commit ${latestSha} (not applied — notify mode)`);
      return;
    }

    log("Change detected. Downloading update...");

    const { zipPath, extractDir, repoRoot } = await downloadAndExtract();

    log("Replacing installed files...");
    replaceFiles(repoRoot);

    // Run npm ci if lockfiles changed or modules missing
    if (needsNpmCi()) {
      log("Installing npm dependencies...");
      run("npm ci --omit=dev --no-fund --no-audit");
      run("npm ci --prefix mcp-server --omit=dev --no-fund --no-audit");
    }

    // Recompile TypeScript
    log("Compiling TypeScript...");
    run("npx tsc -p mcp-server/tsconfig.json");

    // Re-register agent configs
    log("Registering agent configs...");
    run("node install.js setup --skip-build");

    // Cleanup
    rmSync(zipPath, { force: true });
    rmSync(extractDir, { recursive: true, force: true });

    // Record the new SHA
    writeLastCommit(latestSha);

    // Remove notification flag if it existed
    if (existsSync(UPDATE_AVAILABLE_FILE)) {
      rmSync(UPDATE_AVAILABLE_FILE, { force: true });
    }

    log(`Update complete: commit ${latestSha}`);
  } catch (e) {
    log(`Update failed: ${e.message}`);
    log(e.stack || "");
    if (VERBOSE) console.error("Update failed:", e);
  }
}

main();
