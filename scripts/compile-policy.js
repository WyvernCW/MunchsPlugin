#!/usr/bin/env node

import { compilePolicy } from '../mcp-server/build/advanced-runtime.js';
import { fileURLToPath } from 'node:url';

const skillPath = fileURLToPath(new URL('../skill/munch/SKILL.md', import.meta.url));
console.log(JSON.stringify(compilePolicy(skillPath), null, 2));
