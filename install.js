#!/usr/bin/env node

import {
  createInstallContext,
  doctor,
  getInstallPlan,
  install,
  uninstall,
} from './lib/installer-core.js';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const rootDir = dirname(fileURLToPath(import.meta.url));
const context = createInstallContext({ rootDir });
const args = new Set(process.argv.slice(2));
const command = process.argv.slice(2).find((arg) => !arg.startsWith('-')) ?? 'setup';
const dryRun = args.has('--dry-run');
const includeIfeo = !args.has('--no-ifeo');
const skipBuild = args.has('--skip-build');
const codexOnly = args.has('--codex-only');

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

try {
  if (command === 'setup' || command === 'repair') {
    console.log(`⟦§MUNCH INSTALLER⟧ ${command}${dryRun ? ' dry-run' : ''}`);
    const result = install(context, { dryRun, includeIfeo, skipBuild, codexOnly });
    print({
      status: dryRun ? 'planned' : 'installed',
      managedPaths: result.state.ownedPaths.length,
      backups: result.state.backups.length,
      ifeo: result.state.registry.ifeoManaged === true,
      statePath: context.statePath,
    });
  } else if (command === 'doctor') {
    const result = doctor(context);
    print(result);
    if (!result.healthy) process.exitCode = 1;
  } else if (command === 'uninstall') {
    console.log(`⟦§MUNCH INSTALLER⟧ uninstall${dryRun ? ' dry-run' : ''}`);
    print(uninstall(context, { dryRun }));
  } else if (command === 'plan') {
    print(getInstallPlan(context, { includeIfeo, codexOnly }));
  } else {
    console.error('Usage: munch-setup [setup|repair|doctor|uninstall|plan] [--dry-run] [--no-ifeo] [--skip-build] [--codex-only]');
    process.exitCode = 2;
  }
} catch (error) {
  console.error(`⟦§MUNCH INSTALLER⟧ ${command} failed:`, error);
  process.exitCode = 1;
}
