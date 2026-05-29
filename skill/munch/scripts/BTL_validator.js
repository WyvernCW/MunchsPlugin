#!/usr/bin/env node
/**
 * ⟦§MUNCH BTL VALIDATOR v1.0⟧
 * Executes compilations and runs files for JavaScript, TypeScript, Python, and Go,
 * parsing syntax and stack traces to aid the self-correcting Build-Test-Loop.
 */

import { execSync } from 'child_process';
import { existsSync, lstatSync } from 'fs';
import { extname, resolve } from 'path';

function validateFile(filePath) {
  const absPath = resolve(filePath);
  if (!existsSync(absPath)) {
    return { ok: false, error: `File not found: ${filePath}` };
  }

  const ext = extname(absPath);
  let buildCommand = '';
  let runCommand = '';

  switch (ext) {
    case '.js':
      runCommand = `node "${absPath}"`;
      break;
    case '.ts':
      buildCommand = `npx tsc --noEmit "${absPath}"`;
      runCommand = `npx ts-node "${absPath}"`;
      break;
    case '.py':
      buildCommand = `python -m py_compile "${absPath}"`;
      runCommand = `python "${absPath}"`;
      break;
    case '.go':
      buildCommand = `go build -o /dev/null "${absPath}"`; // Unix-centric, for windows we run go vet
      if (process.platform === 'win32') {
        buildCommand = `go vet "${absPath}"`;
      }
      runCommand = `go run "${absPath}"`;
      break;
    default:
      return { ok: false, error: `Unsupported file type: ${ext}` };
  }

  // 1. Run build/compilation check if defined
  if (buildCommand) {
    console.log(`Checking compilation: ${buildCommand}`);
    try {
      execSync(buildCommand, { stdio: 'pipe' });
      console.log("✓ Compilation / Syntax check passed.");
    } catch (err) {
      return {
        ok: false,
        phase: 'Compilation / Build',
        error: err.stderr ? err.stderr.toString() : err.message
      };
    }
  }

  // 2. Run the script and observe outcomes
  console.log(`Executing code: ${runCommand}`);
  try {
    const output = execSync(runCommand, { stdio: 'pipe' });
    return { ok: true, output: output.toString() };
  } catch (err) {
    return {
      ok: false,
      phase: 'Runtime / Execution',
      error: err.stderr ? err.stderr.toString() : err.message,
      output: err.stdout ? err.stdout.toString() : ''
    };
  }
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.log("Usage: node BTL_validator.js <file_path>");
    process.exit(0);
  }

  console.log(`\n⟦§BTL VALIDATING: ${file}⟧`);
  const result = validateFile(file);

  if (result.ok) {
    console.log("\n✅ VALIDATION PASSED");
    console.log("--------------------");
    console.log(result.output || "(no output emitted)");
    process.exit(0);
  } else {
    console.log("\n❌ VALIDATION FAILED");
    console.log("--------------------");
    console.log(`Phase: ${result.phase || 'Pre-check'}`);
    console.log(`Error details:\n${result.error}`);
    if (result.output) {
      console.log(`Stdout before crash:\n${result.output}`);
    }
    process.exit(1);
  }
}

main();
