import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));

test('Vercel functions import safely and enforce MCP authentication', () => {
  const script = `
    process.env.VERCEL = "1";
    delete process.env.MUNCH_HTTP_TOKEN;
    delete process.env.MUNCH_ALLOW_INSECURE_HTTP;
    const statusRoute = await import("./api/status.js");
    const status = await statusRoute.GET();
    const mcpRoute = await import("./api/mcp.js");
    const unavailable = await mcpRoute.POST(new Request("https://example.test/api/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}"
    }));
    const body = await unavailable.json();
    console.log(JSON.stringify({
      statusCode: status.status,
      statusBody: await status.json(),
      mcpCode: unavailable.status,
      mcpError: body.error
    }));
    process.exit(0);
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
    cwd: root,
    encoding: 'utf8',
    timeout: 20_000,
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout.trim());
  assert.equal(output.statusCode, 200);
  assert.equal(output.statusBody.endpoint, '/api/mcp');
  assert.equal(output.mcpCode, 503);
  assert.equal(output.mcpError, 'MUNCH_HTTP_TOKEN is not configured');
});
