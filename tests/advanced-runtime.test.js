import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const runtimeDir = mkdtempSync(join(tmpdir(), 'munch-runtime-'));
process.env.MUNCH_RUNTIME_DIR = runtimeDir;
process.env.MUNCH_RUNTIME_ENCRYPTION_KEY = 'test-only-encryption-key';
const runtime = await import('../mcp-server/build/advanced-runtime.js');

test.after(() => rmSync(runtimeDir, { recursive: true, force: true }));

test('policy, trust, capability, and contradiction engines produce actionable output', () => {
  const skill = join(runtimeDir, 'SKILL.md');
  writeFileSync(skill, '⟦§TEST⟧\n- You MUST verify output.\n- never remove IFEO.\n');
  const policy = runtime.compilePolicy(skill);
  assert.equal(policy.directives.length, 2);

  const settings = runtime.configureRuntimeSettings({
    trustMode: 'strict',
    retentionDays: 30,
    sensitivity: { traces: 'sensitive' },
  });
  assert.equal(settings.trustMode, 'strict');

  const negotiated = runtime.negotiateCapabilities({
    host: 'test-host',
    tools: ['shell'],
    contextBudget: 4000,
    filesystem: 'read',
    network: false,
    mcpTransport: 'stdio',
  });
  assert.equal(negotiated.contextStrategy, 'minimal');
  assert.ok(negotiated.restrictions.includes('no-file-mutation'));

  const contradictions = runtime.detectContradictions([
    { source: 'user', text: 'Never remove the IFEO redirect', priority: 10 },
    { source: 'default', text: 'Remove the IFEO redirect', priority: 1 },
  ]);
  assert.equal(contradictions.contradictionCount, 1);
  assert.equal(contradictions.contradictions[0].resolution, 'user');
});

test('trace replay, provenance, evidence, and evaluation are durable', () => {
  const trace = runtime.startTrace('integration', { seed: 1 });
  runtime.appendTrace(trace.id, 'tool-call', { tool: 'compile' });
  runtime.appendTrace(trace.id, 'result', { exitCode: 0 });
  const replay = runtime.replayTrace(trace.id);
  assert.equal(replay.deterministic, true);
  assert.equal(replay.encrypted, true);
  assert.equal(replay.events.length, 2);

  const provenance = runtime.recordProvenance({
    kind: 'decision',
    content: 'Preserve IFEO',
    source: 'user',
    confidence: 1,
  });
  assert.match(provenance.id, /^PROV_/);
  assert.equal(runtime.getProvenanceGraph().nodes.length, 1);

  const evidence = runtime.createEvidenceBundle({
    title: 'runtime test',
    requirements: ['trace'],
    changes: ['implemented'],
    tests: [{ name: 'unit', status: 'passed' }],
    files: [join(root, 'package.json')],
  });
  assert.equal(evidence.complete, true);
  assert.match(evidence.fileHashes[0].sha256, /^[a-f0-9]{64}$/);

  const evaluation = runtime.runEvaluation({
    name: 'enabled versus baseline',
    cases: [{
      id: 'case-1',
      expected: 'verified',
      enabledOutput: 'verified output',
      baselineOutput: 'guess',
    }],
  });
  assert.equal(evaluation.improvement, 1);
});

test('reference ranking, context packaging, extension verification, graphing, and impact prediction work', () => {
  const referenceDir = join(runtimeDir, 'references');
  mkdirSync(referenceDir, { recursive: true });
  writeFileSync(join(referenceDir, 'security.md'), '# Security\nauthentication authorization verification\n');
  writeFileSync(join(referenceDir, 'frontend.md'), '# Frontend\nlayout typography color\n');
  writeFileSync(join(referenceDir, 'catalog.json'), JSON.stringify({
    schemaVersion: 1,
    references: [
      { id: 'security', file: 'security.md', title: 'Security', version: 1, priority: 'core', keywords: ['security'], dependencies: [], graphIds: [], verification: 'test' },
      { id: 'frontend', file: 'frontend.md', title: 'Frontend', version: 1, priority: 'domain', keywords: ['frontend'], dependencies: [], graphIds: [], verification: 'test' },
    ],
  }));
  const scored = runtime.scoreReferences(referenceDir, 'authentication security');
  assert.equal(scored.ranked[0].id, 'security');
  runtime.recordReferenceOutcome('security', true);
  const context = runtime.buildContextPackage(referenceDir, 'authentication', 1000);
  assert.equal(context.selected[0].id, 'security');

  const pack = join(runtimeDir, 'pack-source');
  mkdirSync(pack);
  const content = '# External Reference\n';
  writeFileSync(join(pack, 'external.md'), content);
  writeFileSync(join(pack, 'munch-reference-pack.json'), JSON.stringify({
    id: 'verified-pack',
    version: '1.0.0',
    compatibleCoreMajor: 1,
    files: [{
      path: 'external.md',
      sha256: createHash('sha256').update(content).digest('hex'),
    }],
  }));
  assert.equal(runtime.installReferencePack(pack).fileCount, 1);
  assert.equal(runtime.listReferencePacks().packs.length, 1);

  const graph = runtime.buildWorkspaceGraph(root, 1000);
  assert.ok(graph.nodes.some((node) => node.path === 'package.json'));
  const impact = runtime.predictChangeImpact(root, ['mcp-server/src/index.ts']);
  assert.ok(impact.recommendedChecks.includes('npm run compile'));
});

test('retention and dashboard snapshot report runtime health', () => {
  const oldTrace = join(runtimeDir, 'traces', 'old.jsonl');
  writeFileSync(oldTrace, '{}\n');
  utimesSync(oldTrace, new Date(0), new Date(0));
  const purged = runtime.purgeExpiredRuntime();
  assert.ok(purged.removed.includes(oldTrace));
  const snapshot = runtime.getControlSnapshot();
  assert.equal(snapshot.status, 'online');
  assert.equal(snapshot.settings.trustMode, 'strict');
  assert.equal(snapshot.evaluations, 1);
  assert.equal(snapshot.encryptionEnabled, true);
  assert.match(runtime.renderControlDashboard(snapshot), /Munch Control/);
});
