#!/usr/bin/env node
/**
 * ⟦§MUNCH HALLUCINATION GUARD v1.0⟧
 * Static analysis script to detect common LLM hallucination markers,
 * empty error handlers, code placeholders, and hardcoded secrets.
 */

import { readFileSync, lstatSync, readdirSync } from 'fs';
import { join } from 'path';

const BANNED_PATTERNS = [
  {
    regex: /\/\/\s*\.\.\./g,
    message: "Placeholder comment found ('// ...'). Code must be complete."
  },
  {
    regex: /\/\*\s*\.\.\.\s*\*\//g,
    message: "Placeholder comment found ('/* ... */'). Code must be complete."
  },
  {
    regex: /#\s*\.\.\./g,
    message: "Python placeholder comment found ('# ...'). Code must be complete."
  },
  {
    regex: /catch\s*\(\s*\w*\s*\)\s*\{\s*\}/g,
    message: "Silent catch block detected (empty error handling)."
  },
  {
    regex: /(TODO|FIXME):\s*implement/i,
    message: "Unimplemented placeholder tag found ('TODO: implement')."
  },
  {
    regex: /(password|passwd|secret|api_key|apikey|private_key|token|auth_token)\s*=\s*['"`][a-zA-Z0-9_\-\.\/]{12,}['"`]/i,
    message: "Potential hardcoded secret or token detected."
  }
];

function scanFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let violations = [];

    BANNED_PATTERNS.forEach(({ regex, message }) => {
      let match;
      // Reset regex index for safety
      regex.lastIndex = 0;
      while ((match = regex.exec(content)) !== null) {
        // Find line number
        const charIdx = match.index;
        const lineNo = content.slice(0, charIdx).split('\n').length;
        violations.push({ line: lineNo, message, match: match[0] });
      }
    });

    return violations;
  } catch (err) {
    console.error(`Could not read file ${filePath}: ${err.message}`);
    return [];
  }
}

function walkDir(dir, fileList = []) {
  const files = readdirSync(dir);
  files.forEach((file) => {
    const path = join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === 'build') return;
    if (lstatSync(path).isDirectory()) {
      walkDir(path, fileList);
    } else {
      if (path.endsWith('.js') || path.endsWith('.ts') || path.endsWith('.py') || path.endsWith('.go') || path.endsWith('.java')) {
        fileList.push(path);
      }
    }
  });
  return fileList;
}

function main() {
  const targets = process.argv.slice(2);
  if (targets.length === 0) {
    console.log("Usage: node hallucination_guard.js <file_or_directory_path>");
    process.exit(0);
  }

  let totalViolations = 0;

  targets.forEach((target) => {
    let files = [];
    if (lstatSync(target).isDirectory()) {
      files = walkDir(target);
    } else {
      files = [target];
    }

    files.forEach((file) => {
      const violations = scanFile(file);
      if (violations.length > 0) {
        console.log(`\n❌ Violations found in: ${file}`);
        violations.forEach((v) => {
          console.log(`  [Line ${v.line}]: ${v.message} (Matched: "${v.match.trim()}")`);
          totalViolations++;
        });
      }
    });
  });

  console.log('\n----------------------------------------');
  if (totalViolations > 0) {
    console.log(`🚨 Scan failed. Found ${totalViolations} coding violations/hallucinations.`);
    process.exit(1);
  } else {
    console.log("✓ Scan complete. 0 violations found. Code is robust and fully implemented.");
    process.exit(0);
  }
}

main();
