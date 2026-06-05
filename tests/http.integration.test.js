import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

async function waitFor(url, options = {}) {
  let lastError;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  throw lastError;
}

test('HTTP runtime enforces health, readiness, authentication, and origins', async (context) => {
  const port = 24_000 + Math.floor(Math.random() * 5_000);
  const home = mkdtempSync(join(tmpdir(), 'munch-http-home-'));
  const child = spawn(
    process.execPath,
    [join(root, 'mcp-server', 'build', 'index.js'), '--sse'],
    {
      cwd: root,
      env: {
        ...process.env,
        PORT: String(port),
        MUNCH_HTTP_TOKEN: 'integration-secret',
        MUNCH_ALLOWED_ORIGINS: 'https://allowed.example',
        MUNCH_DESKTOP_NOTIFICATIONS: 'false',
        HOME: home,
        USERPROFILE: home,
        MUNCH_RUNTIME_DIR: join(home, 'runtime'),
      },
      stdio: ['ignore', 'ignore', 'pipe'],
      windowsHide: true,
    },
  );
  context.after(async () => {
    child.kill();
    if (child.exitCode === null) await once(child, 'exit');
    rmSync(home, { recursive: true, force: true });
  });

  const health = await waitFor(`http://127.0.0.1:${port}/health`);
  assert.equal(health.status, 200);

  const ready = await fetch(`http://127.0.0.1:${port}/ready`);
  assert.equal(ready.status, 200);

  const unauthorized = await fetch(`http://127.0.0.1:${port}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
  });
  assert.equal(unauthorized.status, 401);

  const dashboardUnauthorized = await fetch(`http://127.0.0.1:${port}/dashboard`);
  assert.equal(dashboardUnauthorized.status, 401);

  const dashboard = await fetch(`http://127.0.0.1:${port}/dashboard`, {
    headers: { Authorization: 'Bearer integration-secret' },
  });
  assert.equal(dashboard.status, 200);
  assert.match(await dashboard.text(), /Munch Control/);

  const control = await fetch(`http://127.0.0.1:${port}/control.json`, {
    headers: { Authorization: 'Bearer integration-secret' },
  });
  assert.equal(control.status, 200);
  const controlState = await control.json();
  assert.equal(controlState.status, 'online');
  assert.equal(controlState.activeSessions, 0);
  assert.equal(controlState.memoryNamespaces.activeScope, 'global');
  assert.equal(typeof controlState.memorySummary.regressionFixes, 'number');

  const forbiddenOrigin = await fetch(`http://127.0.0.1:${port}/mcp`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer integration-secret',
      Origin: 'https://blocked.example',
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  assert.equal(forbiddenOrigin.status, 403);
});
