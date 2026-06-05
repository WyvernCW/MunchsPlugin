import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));

test('production frontend bundle includes the React JSX runtime', (context) => {
  const outputDirectory = mkdtempSync(join(tmpdir(), 'munch-frontend-build-'));
  context.after(() => rmSync(outputDirectory, { recursive: true, force: true }));

  const viteEntry = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
  const result = spawnSync(
    process.execPath,
    [viteEntry, 'build', '--outDir', outputDirectory, '--emptyOutDir'],
    {
      cwd: root,
      encoding: 'utf8',
      timeout: 60_000,
      windowsHide: true,
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const assetsDirectory = join(outputDirectory, 'assets');
  const bundleName = readdirSync(assetsDirectory).find(
    (name) => name.startsWith('index-') && name.endsWith('.js'),
  );
  assert.ok(bundleName, 'Vite did not emit an application JavaScript bundle');

  const bundle = readFileSync(join(assetsDirectory, bundleName), 'utf8');
  assert.doesNotMatch(
    bundle,
    /(^|[^\w$])React\.(?:createElement|Fragment)\b/,
    'The production bundle contains a bare React global reference',
  );
});
