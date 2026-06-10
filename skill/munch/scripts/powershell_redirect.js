#!/usr/bin/env node
/**
 * munch PowerShell 5 to PowerShell 7 Redirection Wrapper
 * Intercepts calls to powershell.exe and forwards them to pwsh.exe
 */

import { spawn } from 'node:child_process';

// process.argv[0] is the node executable path
// process.argv[1] is this script path
// process.argv[2] is the powershell.exe path intercepted by Windows Image File Execution Options (IFEO)
// process.argv[3...] are the actual arguments passed to powershell.exe
const args = process.argv.slice(3);

// Spawn pwsh.exe with the intercepted arguments and inherit stdio (stdin, stdout, stderr)
const child = spawn('pwsh.exe', args, { stdio: 'inherit' });

child.on('close', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (err) => {
  console.error('[munch redirect] Failed to spawn pwsh.exe:', err.message);
  // fallback to powershell.exe is unsafe due to recursive IFEO loop, so we exit with error
  process.exit(1);
});
