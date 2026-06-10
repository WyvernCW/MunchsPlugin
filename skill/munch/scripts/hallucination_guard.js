#!/usr/bin/env node
/**
 * ⟦§MUNCH HALLUCINATION GUARD v1.1⟧
 * Detects incomplete code markers, silent error handlers, and likely secrets.
 */

import { existsSync, lstatSync, readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const BANNED_PATTERNS = [
  { regex: /\/\/\s*\.\.\./g, message: 'Placeholder comment found. Code must be complete.' },
  { regex: /\/\*\s*\.\.\.\s*\*\//g, message: 'Placeholder block found. Code must be complete.' },
  { regex: /#\s*\.\.\./g, message: 'Python placeholder comment found. Code must be complete.' },
  { regex: /catch\s*\(\s*\w*\s*\)\s*\{\s*\}/g, message: 'Silent catch block detected.' },
  { regex: /(TODO|FIXME):\s*implement/gi, message: 'Unimplemented placeholder tag found.' },
  { regex: /\/\/\s*(?:your|insert|write)\s+code\s+here/gi, message: 'Common AI code stub placeholder found.' },
  { regex: /\/\/\s*rest\s+of\s+(?:the\s+)?code/gi, message: 'Placeholder rest-of-code comment found.' },
  { regex: /\/\/\s*existing\s+code\s+remains/gi, message: 'Placeholder existing code remains comment found.' },
  {
    regex: /(password|passwd|secret|api_key|apikey|private_key|token|auth_token)\s*=\s*['"`][a-zA-Z0-9_.\/-]{12,}['"`]/gi,
    message: 'Potential hardcoded secret or token detected.',
  },
];

export function scanFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const violations = [];

  for (const { regex, message } of BANNED_PATTERNS) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const line = content.slice(0, match.index).split('\n').length;
      violations.push({ line, message, match: match[0] });
      if (match[0].length === 0) regex.lastIndex++;
    }
  }

  return violations;
}

export function walkDir(dir, fileList = []) {
  for (const file of readdirSync(dir)) {
    const path = join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === 'build') continue;
    if (lstatSync(path).isDirectory()) {
      walkDir(path, fileList);
    } else if (/\.(js|ts|py|go|java)$/i.test(path)) {
      fileList.push(path);
    }
  }
  return fileList;
}

export function scanTargets(targets) {
  const results = [];

  for (const target of targets) {
    if (!existsSync(target)) {
      results.push({
        file: target,
        violations: [{ line: 0, message: 'Target does not exist.', match: target }],
      });
      continue;
    }

    const files = lstatSync(target).isDirectory() ? walkDir(target) : [target];
    for (const file of files) {
      const violations = scanFile(file);
      if (violations.length > 0) results.push({ file, violations });
    }
  }

  return results;
}

export function main() {
  const targets = process.argv.slice(2);
  if (targets.length === 0) {
    console.log('Usage: node hallucination_guard.js <file_or_directory_path>');
    process.exit(0);
  }

  const results = scanTargets(targets);
  let totalViolations = 0;

  for (const result of results) {
    console.log(`\nViolations found in: ${result.file}`);
    for (const violation of result.violations) {
      console.log(`  [Line ${violation.line}]: ${violation.message} (Matched: "${violation.match.trim()}")`);
      totalViolations++;
    }
  }

  console.log('\n----------------------------------------');
  if (totalViolations > 0) {
    console.log(`Scan failed. Found ${totalViolations} coding violations.`);
    process.exit(1);
  }

  console.log('Scan complete. 0 violations found.');
  process.exit(0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
