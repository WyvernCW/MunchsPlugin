import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import https from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
const REPOSITORY = "WyvernCW/MunchsPlugin";
export async function checkForUpdate(currentVersion) {
    const release = await requestJson(`https://api.github.com/repos/${REPOSITORY}/releases/latest`, {
        allowNotFound: true,
    });
    if (!release) {
        return {
            currentVersion,
            latestVersion: currentVersion,
            releaseUrl: `https://github.com/${REPOSITORY}/releases`,
            updateAvailable: false,
        };
    }
    const latestVersion = (release.tag_name ?? currentVersion).replace(/^v/, "");
    return {
        currentVersion,
        latestVersion,
        releaseUrl: release.html_url ?? `https://github.com/${REPOSITORY}/releases`,
        updateAvailable: compareVersions(latestVersion, currentVersion) > 0,
    };
}
export async function applyVersionedUpdate(version) {
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
        throw new Error("Update version must be an exact semantic version");
    }
    if (process.env.MUNCH_ALLOW_UPDATE_APPLY !== "true") {
        throw new Error("Set MUNCH_ALLOW_UPDATE_APPLY=true to permit an explicit versioned update");
    }
    const release = await requestJson(`https://api.github.com/repos/${REPOSITORY}/releases/tags/v${version}`);
    if (!release) {
        throw new Error(`Release v${version} was not found`);
    }
    const packageName = `munch-${version}.tgz`;
    const packageAsset = release.assets?.find((asset) => asset.name === packageName);
    const checksumAsset = release.assets?.find((asset) => asset.name === `${packageName}.sha256`);
    if (!packageAsset || !checksumAsset) {
        throw new Error(`Release v${version} is missing the package or checksum asset`);
    }
    const directory = mkdtempSync(join(tmpdir(), "munch-update-"));
    try {
        const packagePath = join(directory, packageName);
        const checksumPath = join(directory, `${packageName}.sha256`);
        writeFileSync(packagePath, await requestBuffer(packageAsset.browser_download_url));
        writeFileSync(checksumPath, await requestBuffer(checksumAsset.browser_download_url));
        const expected = readFileSync(checksumPath, "utf8").trim().split(/\s+/)[0]?.toLowerCase();
        const actual = createHash("sha256").update(readFileSync(packagePath)).digest("hex");
        if (!expected || expected !== actual)
            throw new Error("Release package checksum verification failed");
        await run(process.platform === "win32" ? "npm.cmd" : "npm", [
            "install",
            "-g",
            packagePath,
            "--ignore-scripts",
        ]);
    }
    finally {
        rmSync(directory, { recursive: true, force: true });
    }
}
function compareVersions(left, right) {
    const parse = (value) => value.split(/[.-]/).slice(0, 3).map((part) => Number(part) || 0);
    const a = parse(left);
    const b = parse(right);
    for (let index = 0; index < 3; index += 1) {
        if (a[index] !== b[index])
            return a[index] - b[index];
    }
    return 0;
}
function requestJson(url, options = {}) {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: {
                Accept: "application/vnd.github+json",
                "User-Agent": "Munch-MCP-Update-Checker",
            },
            timeout: 10_000,
        }, (response) => {
            let body = "";
            response.setEncoding("utf8");
            response.on("data", (chunk) => {
                body += chunk;
                if (body.length > 1_000_000)
                    response.destroy(new Error("Update response is too large"));
            });
            response.on("end", () => {
                if (response.statusCode === 404 && options.allowNotFound) {
                    resolve(undefined);
                    return;
                }
                if ((response.statusCode ?? 500) >= 400) {
                    reject(new Error(`Update check failed with HTTP ${response.statusCode}`));
                    return;
                }
                try {
                    resolve(JSON.parse(body));
                }
                catch (error) {
                    reject(error);
                }
            });
        }).on("error", reject);
    });
}
function requestBuffer(url, redirects = 0) {
    if (redirects > 5)
        return Promise.reject(new Error("Too many update download redirects"));
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { "User-Agent": "Munch-MCP-Updater" }, timeout: 15_000 }, (response) => {
            if (response.statusCode &&
                response.statusCode >= 300 &&
                response.statusCode < 400 &&
                response.headers.location) {
                response.resume();
                requestBuffer(new URL(response.headers.location, url).toString(), redirects + 1)
                    .then(resolve, reject);
                return;
            }
            if ((response.statusCode ?? 500) >= 400) {
                reject(new Error(`Update download failed with HTTP ${response.statusCode}`));
                return;
            }
            const chunks = [];
            let size = 0;
            response.on("data", (chunk) => {
                size += chunk.length;
                if (size > 25_000_000)
                    response.destroy(new Error("Update asset is too large"));
                else
                    chunks.push(chunk);
            });
            response.on("end", () => resolve(Buffer.concat(chunks)));
        }).on("error", reject);
    });
}
function run(command, args) {
    return new Promise((resolve, reject) => {
        execFile(command, args, { windowsHide: true }, (error) => {
            if (error)
                reject(error);
            else
                resolve();
        });
    });
}
