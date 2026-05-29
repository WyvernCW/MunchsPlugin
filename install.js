#!/usr/bin/env node
/**
 * munch Automated Installer Script v1.0
 * Cross-platform installer to copy skills/plugins and configure MCP host files automatically.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const homedir = os.homedir();

// Paths in the local repository
const LOCAL_SKILL_SRC = join(__dirname, 'skill/munch/SKILL.md');
const LOCAL_OPENCODE_PLUGIN_SRC = join(__dirname, 'opencode-plugin/munch.plugin.ts');
const LOCAL_CODEX_PLUGIN_DIR = join(__dirname, 'codex-plugin');

console.log('⟦§MUNCH INSTALLER⟧ Starting auto-setup...');

// ──────────────────────────────────────────────
// 1. Copy Skill Files
// ──────────────────────────────────────────────
const skillTargets = [
  join(homedir, '.claude/skills/munch/SKILL.md'),
  join(homedir, '.kilocode/skills/munch/SKILL.md'),
  join(homedir, '.agents/skills/munch/SKILL.md'),
  join(homedir, '.gemini/skills/munch/SKILL.md'),
  join(homedir, '.config/opencode/skills/munch/SKILL.md'),
  join(homedir, '.opencode/skills/munch/SKILL.md'),
];

skillTargets.forEach((target) => {
  try {
    const dir = dirname(target);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    copyFileSync(LOCAL_SKILL_SRC, target);
    console.log(`✓ Copied skill to: ${target}`);
  } catch (err) {
    console.error(`✗ Failed to copy skill to ${target}:`, err.message);
  }
});

// ──────────────────────────────────────────────
// 2. Copy Plugin Files
// ──────────────────────────────────────────────
const opencodePluginTargets = [
  join(homedir, '.config/opencode/plugins/munch.plugin.ts'),
  join(homedir, '.opencode/plugins/munch.plugin.ts'),
];

opencodePluginTargets.forEach((target) => {
  try {
    const dir = dirname(target);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    copyFileSync(LOCAL_OPENCODE_PLUGIN_SRC, target);
    console.log(`✓ Copied OpenCode plugin to: ${target}`);
  } catch (err) {
    console.error(`✗ Failed to copy OpenCode plugin to ${target}:`, err.message);
  }
});

// Codex/Antigravity plugins (requires copying entire folder structures)
const pluginFolders = [
  {
    dest: join(homedir, '.agents/plugins/munch'),
    skillDest: join(homedir, '.agents/plugins/munch/skill/munch/SKILL.md'),
  },
  {
    dest: join(homedir, '.gemini/config/plugins/munch'),
    skillDest: null,
  },
];

pluginFolders.forEach(({ dest, skillDest }) => {
  try {
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true });
    }
    // Copy manifest yaml
    const yamlSrc = join(LOCAL_CODEX_PLUGIN_DIR, 'agents/openai.yaml');
    const yamlDestDir = join(dest, 'agents');
    if (!existsSync(yamlDestDir)) {
      mkdirSync(yamlDestDir, { recursive: true });
    }
    copyFileSync(yamlSrc, join(yamlDestDir, 'openai.yaml'));

    if (skillDest) {
      const skillDestDir = dirname(skillDest);
      if (!existsSync(skillDestDir)) {
        mkdirSync(skillDestDir, { recursive: true });
      }
      copyFileSync(LOCAL_SKILL_SRC, skillDest);
    }
    console.log(`✓ Configured Codex/Antigravity plugin directory at: ${dest}`);
  } catch (err) {
    console.error(`✗ Failed to configure plugin at ${dest}:`, err.message);
  }
});

// ──────────────────────────────────────────────
// 3. Compile MCP Server
// ──────────────────────────────────────────────
console.log('Building MCP Server in mcp-server/ directory...');
try {
  const mcpServerPath = join(__dirname, 'mcp-server');
  console.log('Running npm install...');
  execSync('npm install', { cwd: mcpServerPath, stdio: 'inherit' });
  console.log('Running npm run build...');
  execSync('npm run build', { cwd: mcpServerPath, stdio: 'inherit' });
  console.log('✓ Compiled MCP Server successfully.');
} catch (err) {
  console.error('✗ Failed to compile MCP Server:', err.message);
}

// ──────────────────────────────────────────────
// 4. Configure settings.json for Claude Code and Antigravity
// ──────────────────────────────────────────────
const mcpScriptPath = resolve(__dirname, 'mcp-server/build/index.js');

// Helper to update json config files containing mcpServers block
function updateJsonConfig(configPath, key) {
  try {
    const dir = dirname(configPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    let config = {};
    if (existsSync(configPath)) {
      try {
        config = JSON.parse(readFileSync(configPath, 'utf8'));
      } catch (e) {
        console.warn(`! Failed to parse existing ${configPath}, rewriting...`);
      }
    }

    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    config.mcpServers.munch = {
      command: 'npx',
      args: ['-y', 'github:WyvernCW/MunchsPlugin'],
    };

    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log(`✓ Registered remote munch MCP server (npx) in: ${configPath}`);
  } catch (err) {
    console.error(`✗ Failed to write config ${configPath}:`, err.message);
  }
}

// Claude Code config paths
const claudeConfigPaths = [
  join(homedir, '.claude/settings.json'),
];
if (process.platform === 'win32') {
  claudeConfigPaths.push(join(homedir, 'AppData/Roaming/ClaudeCode/settings.json'));
} else if (process.platform === 'darwin') {
  claudeConfigPaths.push(join(homedir, 'Library/Application Support/ClaudeCode/settings.json'));
} else {
  claudeConfigPaths.push(join(homedir, '.config/ClaudeCode/settings.json'));
}

claudeConfigPaths.forEach((p) => {
  // If the directory exists or it's the home config, we attempt to write/update it
  if (existsSync(dirname(p)) || p.includes('.claude')) {
    updateJsonConfig(p, 'munch');
  }
});

// Antigravity config path
updateJsonConfig(join(homedir, '.gemini/config/mcp_config.json'), 'munch');

console.log('\n======================================================');
console.log('⟦§MUNCH AUTO-INSTALL COMPLETE⟧');
console.log('Installed files:');
console.log(`  • Skill: ~/.gemini/skills/munch/SKILL.md`);
console.log(`  • Skill: ~/.claude/skills/munch/SKILL.md`);
console.log(`  • MCP command: npx -y github:WyvernCW/MunchsPlugin`);
console.log('Restart your AI Agent (e.g. Claude Code) to load the changes.');
console.log('======================================================\n');
