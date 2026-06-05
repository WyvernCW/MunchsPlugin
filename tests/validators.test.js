import assert from 'node:assert/strict';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  scanFile,
  scanTargets,
} from '../skill/munch/scripts/hallucination_guard.js';
import {
  findNearestTsconfig,
  validateFile,
} from '../skill/munch/scripts/BTL_validator.js';
import {
  createInstallContext,
  doctor,
  getInstallPlan,
  install,
  readInstallState,
  uninstall,
} from '../lib/installer-core.js';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const skillDirectory = join(repositoryRoot, 'skill', 'munch');
const referencesDirectory = join(skillDirectory, 'references');

function withTempDir(run) {
  const dir = mkdtempSync(join(tmpdir(), 'munch-test-'));
  try {
    return run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('hallucination guard reports repeated case-insensitive markers without looping', () => {
  withTempDir((dir) => {
    const target = join(dir, 'sample.js');
    const firstMarker = ['TO', 'DO: implement'].join('');
    const secondMarker = ['FIX', 'ME: IMPLEMENT'].join('');
    writeFileSync(target, `// ${firstMarker}\n// ${secondMarker}\n`, 'utf8');
    const violations = scanFile(target);
    assert.equal(violations.length, 2);
  });
});

test('hallucination guard reports a missing target', () => {
  const results = scanTargets([join(tmpdir(), `missing-${Date.now()}.js`)]);
  assert.equal(results.length, 1);
  assert.equal(results[0].violations[0].line, 0);
});

test('BTL validator finds the nearest project tsconfig', () => {
  withTempDir((dir) => {
    const nested = join(dir, 'src', 'nested');
    mkdirSync(nested, { recursive: true });
    const config = join(dir, 'tsconfig.json');
    const target = join(nested, 'sample.ts');
    writeFileSync(config, '{"compilerOptions":{"strict":true}}', 'utf8');
    writeFileSync(target, 'export const value: number = 1;\n', 'utf8');
    assert.equal(findNearestTsconfig(target), config);
  });
});

test('BTL validator uses syntax-only validation for JavaScript', () => {
  withTempDir((dir) => {
    const target = join(dir, 'sample.js');
    writeFileSync(target, 'throw new Error("must not execute");\n', 'utf8');
    const result = validateFile(target);
    assert.equal(result.ok, true);
  });
});

test('every supporting reference routed by SKILL.md exists', () => {
  const skill = readFileSync(join(skillDirectory, 'SKILL.md'), 'utf8');
  const routedReferences = [
    ...skill.matchAll(/references\/([A-Za-z0-9_]+\.md)/g),
  ].map((match) => match[1]);

  assert.ok(routedReferences.length > 0);
  for (const reference of new Set(routedReferences)) {
    assert.equal(
      existsSync(join(referencesDirectory, reference)),
      true,
      `Missing supporting reference: ${reference}`,
    );
  }
});

test('every supporting reference is routed by SKILL.md', () => {
  const skill = readFileSync(join(skillDirectory, 'SKILL.md'), 'utf8');
  const routedReferences = new Set(
    [...skill.matchAll(/references\/([A-Za-z0-9_]+\.md)/g)]
      .map((match) => match[1]),
  );
  const references = readdirSync(referencesDirectory)
    .filter((name) => name.endsWith('.md'));

  for (const reference of references) {
    assert.equal(
      routedReferences.has(reference),
      true,
      `Unrouted supporting reference: ${reference}`,
    );
  }
});

test('supporting references remain platform-neutral', () => {
  const references = readdirSync(referencesDirectory)
    .filter((name) => name.endsWith('.md'));

  for (const reference of references) {
    const content = readFileSync(join(referencesDirectory, reference), 'utf8');
    assert.doesNotMatch(
      content,
      /This is structural validation line \d+/,
      `Artificial line-count padding found in ${reference}`,
    );
    assert.doesNotMatch(
      content,
      /\bdocker(?:file|files|\s+hub|\s+image|\s+container|\s+registry|\s+build|\s+mapping|\s+tag)?\b/i,
      `Container-specific guidance found in ${reference}`,
    );
  }
});

test('supporting references expose agent guidance and Mermaid metadata', () => {
  const references = readdirSync(referencesDirectory)
    .filter((name) => name.endsWith('.md'));
  const standardizedReferences = new Set([
    'accessibility_engineering.md',
    'cli_tui_engineering.md',
    'code_review_refactoring.md',
    'distributed_systems.md',
    'documentation_engineering.md',
    'network_protocols.md',
    'observability_debugging.md',
    'security_engineering.md',
    'windows_installer_updater.md',
    'windows_systems.md',
  ]);
  const graphIds = new Map();

  for (const reference of references) {
    const content = readFileSync(join(referencesDirectory, reference), 'utf8');
    const ids = [...content.matchAll(/%% graph_id:\s*([A-Za-z0-9_-]+)/g)]
      .map((match) => match[1]);

    if (standardizedReferences.has(reference)) {
      assert.match(
        content,
        /## How AI Agents Should Use This Skill/,
        `Missing AI usage guidance in ${reference}`,
      );
      assert.match(
        content,
        /### Activation Triggers/,
        `Missing activation guidance in ${reference}`,
      );
      assert.match(content, /## Integration Map/, `Missing integration map in ${reference}`);
      assert.match(content, /## Completion Contract/, `Missing completion contract in ${reference}`);
      assert.equal(ids.length, 2, `Expected two Mermaid graph IDs in ${reference}`);
    }

    for (const id of ids) {
      assert.equal(
        graphIds.has(id),
        false,
        `Duplicate Mermaid graph ID ${id} in ${reference} and ${graphIds.get(id)}`,
      );
      graphIds.set(id, reference);
    }
  }
});

test('installer supports reversible setup in an isolated home', () => {
  withTempDir((homeDir) => {
    const existingSkill = join(homeDir, '.agents', 'skills', 'munch');
    mkdirSync(existingSkill, { recursive: true });
    writeFileSync(join(existingSkill, 'user-file.txt'), 'preserve me\n');
    const context = createInstallContext({
      rootDir: repositoryRoot,
      homeDir,
      platform: 'linux',
      nodePath: process.execPath,
    });

    const result = install(context, {
      includeIfeo: false,
      skipBuild: true,
    });
    assert.ok(result.state.ownedPaths.length > 10);
    assert.ok(readInstallState(context));
    assert.equal(doctor(context).healthy, true);
    assert.equal(
      existsSync(join(homeDir, '.agents', 'skills', 'munch', 'SKILL.md')),
      true,
    );

    const repaired = install(context, {
      includeIfeo: false,
      skipBuild: true,
    });
    assert.equal(repaired.state.backups.length, result.state.backups.length);

    const removed = uninstall(context);
    assert.ok(removed.removed.length > 0);
    assert.equal(readInstallState(context), null);
    assert.equal(
      readFileSync(join(existingSkill, 'user-file.txt'), 'utf8'),
      'preserve me\n',
    );
    assert.equal(existsSync(join(existingSkill, 'SKILL.md')), false);
  });
});

test('installer dry-run does not mutate the target home', () => {
  withTempDir((homeDir) => {
    const context = createInstallContext({
      rootDir: repositoryRoot,
      homeDir,
      platform: 'linux',
      nodePath: process.execPath,
    });
    const result = install(context, {
      dryRun: true,
      includeIfeo: false,
      skipBuild: true,
    });
    assert.ok(result.state.ownedPaths.length > 10);
    assert.equal(existsSync(context.statePath), false);
    assert.equal(existsSync(join(homeDir, '.agents')), false);
  });
});

test('Windows installer retains explicit HKLM PowerShell IFEO support', () => {
  const context = createInstallContext({
    rootDir: repositoryRoot,
    homeDir: 'C:\\Users\\munch-test',
    platform: 'win32',
    nodePath: 'C:\\Program Files\\nodejs\\node.exe',
  });
  assert.equal(getInstallPlan(context).includeIfeo, true);
  const installerSource = readFileSync(
    join(repositoryRoot, 'lib', 'installer-core.js'),
    'utf8',
  );
  assert.match(installerSource, /Image File Execution Options\\\\powershell\.exe/);
  assert.match(installerSource, /powershell_redirect\.js/);
});
