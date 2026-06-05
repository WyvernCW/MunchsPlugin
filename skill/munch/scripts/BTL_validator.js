#!/usr/bin/env node
/**
 * ⟦§MUNCH BTL VALIDATOR v1.1⟧
 * Performs project-aware compilation and syntax validation without executing
 * the target program as a side effect.
 */

import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { dirname, extname, join, parse, resolve } from 'path';
import { fileURLToPath } from 'url';

export function findNearestTsconfig(filePath) {
  let current = dirname(resolve(filePath));
  const root = parse(current).root;

  while (true) {
    const candidate = join(current, 'tsconfig.json');
    if (existsSync(candidate)) return candidate;
    if (current === root) return undefined;
    current = dirname(current);
  }
}

export function findNearestTypeScriptCompiler(startPath) {
  let current = dirname(resolve(startPath));
  const root = parse(current).root;

  while (true) {
    const candidate = join(current, 'node_modules', 'typescript', 'bin', 'tsc');
    if (existsSync(candidate)) return candidate;
    if (current === root) return undefined;
    current = dirname(current);
  }
}

function run(command, args, cwd) {
  console.log(`Executing: ${command} ${args.map((arg) => JSON.stringify(arg)).join(' ')}`);
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell: false,
  });

  if (result.error) {
    return { ok: false, error: result.error.message, output: result.stdout ?? '' };
  }

  return {
    ok: result.status === 0,
    error: result.stderr || `Process exited with status ${result.status}`,
    output: result.stdout ?? '',
  };
}

export function validateFile(filePath) {
  const absPath = resolve(filePath);
  if (!existsSync(absPath)) {
    return { ok: false, phase: 'Pre-check', error: `File not found: ${filePath}` };
  }

  const ext = extname(absPath).toLowerCase();
  let command;
  let args;
  let cwd;

  switch (ext) {
    case '.js':
      command = process.execPath;
      args = ['--check', absPath];
      break;
    case '.ts': {
      const tsconfig = findNearestTsconfig(absPath);
      if (!tsconfig) {
        return {
          ok: false,
          phase: 'Pre-check',
          error: `No tsconfig.json found for: ${filePath}`,
        };
      }
      const compiler = findNearestTypeScriptCompiler(tsconfig);
      if (!compiler) {
        return {
          ok: false,
          phase: 'Pre-check',
          error: `TypeScript is not installed near: ${tsconfig}. Run npm install in the project first.`,
        };
      }
      command = process.execPath;
      args = [compiler, '--noEmit', '-p', tsconfig];
      cwd = dirname(tsconfig);
      break;
    }
    case '.py':
      command = 'python';
      args = ['-m', 'py_compile', absPath];
      break;
    case '.go':
      command = 'go';
      args = ['vet', absPath];
      break;
    default:
      return { ok: false, phase: 'Pre-check', error: `Unsupported file type: ${ext}` };
  }

  const result = run(command, args, cwd);
  return result.ok
    ? { ok: true, output: result.output || '(build-only validation)' }
    : {
        ok: false,
        phase: 'Compilation / Syntax',
        error: result.error,
        output: result.output,
      };
}

export function main() {
  const file = process.argv[2];
  if (!file) {
    console.log('Usage: node BTL_validator.js <file_path>');
    process.exit(0);
  }

  console.log(`\n⟦§BTL VALIDATING: ${file}⟧`);
  const result = validateFile(file);

  if (result.ok) {
    console.log('\nVALIDATION PASSED');
    console.log('-----------------');
    console.log(result.output);
    process.exit(0);
  }

  console.log('\nVALIDATION FAILED');
  console.log('-----------------');
  console.log(`Phase: ${result.phase}`);
  console.log(`Error details:\n${result.error}`);
  if (result.output) {
    console.log(`Stdout before failure:\n${result.output}`);
  }
  process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
