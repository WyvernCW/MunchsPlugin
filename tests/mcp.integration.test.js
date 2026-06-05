import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const root = fileURLToPath(new URL('..', import.meta.url));

test('stdio MCP supports selective references and redacted project memory', async () => {
  const home = mkdtempSync(join(tmpdir(), 'munch-mcp-home-'));
  const client = new Client({ name: 'munch-integration', version: '1.0.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(root, 'mcp-server', 'build', 'index.js')],
    cwd: root,
    env: {
      ...process.env,
      HOME: home,
      USERPROFILE: home,
      MUNCH_MEMORY_SCOPE: 'project',
      MUNCH_DESKTOP_NOTIFICATIONS: 'false',
      MUNCH_SKILL_PATH: join(root, 'skill', 'munch', 'SKILL.md'),
      MUNCH_RUNTIME_DIR: join(home, 'runtime'),
      MUNCH_RUNTIME_ENCRYPTION_KEY: 'integration-encryption-key',
    },
    stderr: 'pipe',
  });

  try {
    await client.connect(transport);
    const references = await client.callTool({ name: 'list_references', arguments: {} });
    const referenceText = references.content.find((item) => item.type === 'text')?.text ?? '';
    assert.match(referenceText, /network_protocols\.md/);

    const loaded = await client.callTool({
      name: 'load_reference',
      arguments: { name: 'network_protocols' },
    });
    const loadedText = loaded.content.find((item) => item.type === 'text')?.text ?? '';
    assert.match(loadedText, /graph_id: network_protocols_connection_flow_v1/);

    await client.callTool({
      name: 'remember_lesson',
      arguments: {
        category: 'Integration',
        symptom: 'api_key=super-secret',
        fix: 'password=hunter2',
        context: 'project scoped test',
      },
    });
    const exported = await client.callTool({ name: 'export_memory', arguments: {} });
    const exportText = exported.content.find((item) => item.type === 'text')?.text ?? '';
    assert.match(exportText, /"scope": "project"/);
    assert.doesNotMatch(exportText, /super-secret|hunter2/);
    assert.match(exportText, /\[REDACTED\]/);

    const policy = await client.callTool({ name: 'compile_policy', arguments: {} });
    assert.match(policy.content.find((item) => item.type === 'text')?.text ?? '', /sourceHash/);

    const capability = await client.callTool({
      name: 'negotiate_capabilities',
      arguments: {
        host: 'integration',
        tools: ['shell'],
        contextBudget: 8000,
        filesystem: 'write',
        network: false,
        mcpTransport: 'stdio',
      },
    });
    assert.match(capability.content.find((item) => item.type === 'text')?.text ?? '', /offline-sources-only/);

    const trace = await client.callTool({
      name: 'start_trace',
      arguments: { label: 'integration-trace', metadata: { deterministic: true } },
    });
    const traceData = JSON.parse(trace.content.find((item) => item.type === 'text')?.text ?? '{}');
    await client.callTool({
      name: 'append_trace',
      arguments: { traceId: traceData.id, type: 'verification', payload: { passed: true } },
    });
    const replay = await client.callTool({
      name: 'replay_trace',
      arguments: { traceId: traceData.id },
    });
    assert.match(replay.content.find((item) => item.type === 'text')?.text ?? '', /"deterministic": true/);

    const contextPackage = await client.callTool({
      name: 'build_context_package',
      arguments: { query: 'network protocols', tokenBudget: 3000 },
    });
    assert.match(contextPackage.content.find((item) => item.type === 'text')?.text ?? '', /network_protocols/);

    const control = await client.callTool({ name: 'get_control_snapshot', arguments: {} });
    const controlText = control.content.find((item) => item.type === 'text')?.text ?? '';
    assert.match(controlText, /"encryptionEnabled": true/);
    assert.match(controlText, /"loaded": \[\s+"network_protocols\.md"/);
    assert.match(controlText, /"regressionFixes":/);
  } finally {
    await transport.close();
    rmSync(home, { recursive: true, force: true });
  }
});
