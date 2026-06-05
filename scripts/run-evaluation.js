#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runEvaluation } from '../mcp-server/build/advanced-runtime.js';

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node scripts/run-evaluation.js <evaluation.json>');
  process.exitCode = 2;
} else {
  const input = JSON.parse(readFileSync(resolve(inputPath), 'utf8'));
  console.log(JSON.stringify(runEvaluation(input), null, 2));
}
