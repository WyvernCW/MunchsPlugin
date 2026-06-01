#!/usr/bin/env node
/**
 * munch Automated Installer Script v1.0
 * Cross-platform installer to copy skills/plugins and configure MCP host files automatically.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, cpSync, unlinkSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
let homedir = os.homedir();

// Support sudo environments on non-Windows platforms (like Ubuntu/WSL2)
if (process.platform !== 'win32' && process.env.SUDO_USER) {
  try {
    const realUser = process.env.SUDO_USER;
    const realHome = execSync(`getent passwd ${realUser} | cut -d: -f6`).toString().trim();
    if (realHome) {
      homedir = realHome;
      console.log(`⟦§MUNCH INSTALLER⟧ Detected sudo. Target home directory set to: ${homedir}`);
    }
  } catch (err) {
    if (process.env.HOME && !process.env.HOME.startsWith('/root')) {
      homedir = process.env.HOME;
    }
  }
}

// Paths in the local repository
const LOCAL_SKILL_DIR = join(__dirname, 'skill/munch');
const LOCAL_OPENCODE_PLUGIN_SRC = join(__dirname, 'opencode-plugin/munch.plugin.ts');

console.log('⟦§MUNCH INSTALLER⟧ Starting auto-setup...');

// ──────────────────────────────────────────────
// 1. Copy Skill Packages (Recursive)
// ──────────────────────────────────────────────
const skillTargets = [
  join(homedir, '.claude/skills/munch'),
  join(homedir, '.kilocode/skills/munch'),
  join(homedir, '.agents/skills/munch'),
  join(homedir, '.codex/skills/munch'),
  join(homedir, '.gemini/skills/munch'),
  join(homedir, '.gemini/config/plugins/munch/skills/munch'),
  join(homedir, '.config/opencode/skills/munch'),
  join(homedir, '.opencode/skills/munch'),
];

skillTargets.forEach((target) => {
  try {
    if (!existsSync(target)) {
      mkdirSync(target, { recursive: true });
    }
    cpSync(LOCAL_SKILL_DIR, target, { recursive: true });
    console.log(`✓ Copied skill package recursively to: ${target}`);
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

// Antigravity plugin manifest copy
try {
  const pluginRoot = join(homedir, '.gemini/config/plugins/munch');
  const destAgents = join(pluginRoot, 'agents');
  if (!existsSync(destAgents)) {
    mkdirSync(destAgents, { recursive: true });
  }
  copyFileSync(join(LOCAL_SKILL_DIR, 'agents/openai.yaml'), join(destAgents, 'openai.yaml'));
  
  // Copy plugin.json to plugin root
  const pluginJsonDest = join(pluginRoot, 'plugin.json');
  copyFileSync(join(__dirname, 'plugin.json'), pluginJsonDest);

  // Copy munch_plugin_logo.png to plugin root
  const pluginLogoDest = join(pluginRoot, 'munch_plugin_logo.png');
  copyFileSync(join(__dirname, 'munch_plugin_logo.png'), pluginLogoDest);
  console.log(`✓ Configured Antigravity plugin directory at: ${pluginRoot}`);
} catch (err) {
  console.error(`✗ Failed to configure Antigravity plugin:`, err.message);
}

// Copy logo to .munchmemory for global notifications
try {
  const memoryDir = join(homedir, '.munchmemory');
  if (!existsSync(memoryDir)) {
    mkdirSync(memoryDir, { recursive: true });
  }
  const sourceLogo = join(LOCAL_SKILL_DIR, 'assets/munch_plugin_logo.png');
  const destLogo = join(memoryDir, 'munch_plugin_logo.png');
  if (existsSync(sourceLogo)) {
    copyFileSync(sourceLogo, destLogo);
    console.log(`✓ Copied logo to persistent memory path: ${destLogo}`);
  }
} catch (err) {
  console.error(`✗ Failed to copy logo to persistent memory:`, err.message);
}

// ──────────────────────────────────────────────
// 2b. Copy Codex Local-Plugins Marketplace Files
// ──────────────────────────────────────────────
try {
  const localMarketplaceRoot = join(homedir, '.codex/local-plugins');
  const agentsPluginsDir = join(localMarketplaceRoot, '.agents/plugins');
  const pluginDir = join(localMarketplaceRoot, 'plugins/munch');
  const pluginCodexPluginDir = join(pluginDir, '.codex-plugin');
  const pluginAssetsDir = join(pluginDir, 'assets');
  const pluginSkillsDir = join(pluginDir, 'skills/munch');

  // Create directories
  mkdirSync(agentsPluginsDir, { recursive: true });
  mkdirSync(pluginCodexPluginDir, { recursive: true });
  mkdirSync(pluginAssetsDir, { recursive: true });
  mkdirSync(pluginSkillsDir, { recursive: true });

  // Copy marketplace.json
  copyFileSync(join(__dirname, 'marketplace.json'), join(agentsPluginsDir, 'marketplace.json'));

  // Copy .codex-plugin/plugin.json
  copyFileSync(join(__dirname, '.codex-plugin/plugin.json'), join(pluginCodexPluginDir, 'plugin.json'));

  // Copy assets
  copyFileSync(join(__dirname, 'munch_plugin_logo.png'), join(pluginAssetsDir, 'munch_plugin_logo.png'));
  copyFileSync(join(__dirname, 'skill/munch/assets/munch_plugin_logo.svg'), join(pluginAssetsDir, 'munch_plugin_logo.svg'));

  // Copy skills recursively
  cpSync(LOCAL_SKILL_DIR, pluginSkillsDir, { recursive: true });

  console.log(`✓ Configured Codex Local-Plugins Marketplace at: ${localMarketplaceRoot}`);
} catch (err) {
  console.error(`✗ Failed to configure Codex Local-Plugins Marketplace:`, err.message);
}

// ──────────────────────────────────────────────
// 3. Compile MCP Server (Skip if already built or running from node_modules)
// ──────────────────────────────────────────────
const mcpBuiltPath = join(__dirname, 'mcp-server/build/index.js');
const isInstalledPkg = __dirname.includes('node_modules');

if (isInstalledPkg && existsSync(mcpBuiltPath)) {
  console.log('✓ MCP Server is pre-compiled. Skipping build step.');
} else {
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
      command: 'node',
      args: [mcpScriptPath.replace(/\\/g, '/')],
      env: {}
    };

    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log(`✓ Registered local munch MCP server in: ${configPath}`);
  } catch (err) {
    console.error(`✗ Failed to write config ${configPath}:`, err.message);
  }
}

// OpenCode config helper
function updateOpenCodeConfig(configPath) {
  try {
    const dir = dirname(configPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    let config = {};
    if (existsSync(configPath)) {
      try {
        config = JSON.parse(readFileSync(configPath, 'utf8'));
      } catch (e) {}
    }
    if (!config.mcp) config.mcp = {};
    config.mcp.munch = {
      type: 'remote',
      url: 'https://munchsplugin-production.up.railway.app/sse',
      enabled: true
    };
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log(`✓ Registered remote munch MCP server (SSE) in OpenCode: ${configPath}`);
  } catch (err) {
    console.error(`✗ Failed to write OpenCode config ${configPath}:`, err.message);
  }
}

function updateCodexConfig(configPath) {
  try {
    const dir = dirname(configPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    let content = '';
    if (existsSync(configPath)) {
      content = readFileSync(configPath, 'utf8');
    }

    // Clean up legacy incorrect [mcp.munch] block if exists
    content = content.replace(/\[mcp\.munch\]\s*\n\s*url\s*=\s*"[^"]*"\s*\n?/g, '');

    // 1. Register MCP Server (using the correct [mcp_servers.munch] local format)
    const normalizedScriptPath = mcpScriptPath.replace(/\\/g, '/');
    const mcpEntry = `[mcp_servers.munch]\ncommand = "node"\nargs = ["${normalizedScriptPath}"]`;
    if (content.includes('[mcp_servers.munch]')) {
      const regex = /\[mcp_servers\.munch\][\s\S]*?(?=\n\n\[|\n\[(?!mcp_servers\.munch)|$)/;
      content = content.replace(regex, mcpEntry);
    } else {
      content = content.trim() + '\n\n' + mcpEntry + '\n';
    }

    // 2. Register and enable the skill (using the correct [[skills.config]] format)
    const skillFilePath = join(homedir, '.codex/skills/munch/SKILL.md').replace(/\\/g, '/');
    const skillEntry = `[[skills.config]]\npath = "${skillFilePath}"\nenabled = true`;

    const escapedPath = skillFilePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const skillRegex = new RegExp(`\\[\\[skills\\.config\\]\\]\\s*\\n\\s*path\\s*=\\s*"${escapedPath}"\\s*\\n\\s*enabled\\s*=\\s*(true|false)`, 'g');

    if (!skillRegex.test(content)) {
      content = content.trim() + '\n\n' + skillEntry + '\n';
    } else {
      content = content.replace(skillRegex, `[[skills.config]]\npath = "${skillFilePath}"\nenabled = true`);
    }

    // 3. Register local-plugins marketplace
    const localMarketplaceRoot = join(homedir, '.codex/local-plugins').replace(/\\/g, '/');
    const marketplaceEntry = `[marketplaces.local-plugins]\nsource_type = "local"\nsource = "${localMarketplaceRoot}"`;
    if (content.includes('[marketplaces.local-plugins]')) {
      const regex = /\[marketplaces\.local-plugins\][\s\S]*?(?=\n\n\[|\n\[(?!marketplaces)|$)/;
      content = content.replace(regex, marketplaceEntry);
    } else {
      content = content.trim() + '\n\n' + marketplaceEntry + '\n';
    }

    // 4. Enable the munch plugin
    const enablePluginEntry = `[plugins."munch@local-plugins"]\nenabled = true`;
    if (content.includes('[plugins."munch@local-plugins"]')) {
      const regex = /\[plugins\."munch@local-plugins"\][\s\S]*?(?=\n\n\[|\n\[(?!plugins\."munch)|$)/;
      content = content.replace(regex, enablePluginEntry);
    } else {
      content = content.trim() + '\n\n' + enablePluginEntry + '\n';
    }

    // Normalize: ensure each TOML section is separated by exactly one blank line
    content = content.replace(/\n{3,}/g, '\n\n');

    writeFileSync(configPath, content.trim() + '\n', 'utf8');
    console.log(`✓ Registered local munch MCP server, enabled skill, and registered plugin in Codex: ${configPath}`);
  } catch (err) {
    console.error(`✗ Failed to write Codex config ${configPath}:`, err.message);
  }
}

// ──────────────────────────────────────────────
// 5. Update Configurations for All Hosts
// ──────────────────────────────────────────────

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
  if (existsSync(dirname(p)) || p.includes('.claude')) {
    updateJsonConfig(p, 'munch');
  }
});

// Antigravity config path
updateJsonConfig(join(homedir, '.gemini/config/mcp_config.json'), 'munch');

// KiloCode config paths
const kilocodePaths = [
  join(homedir, '.kilocode/settings.json'),
  join(homedir, '.config/kilocode/settings.json'),
];
kilocodePaths.forEach((p) => {
  if (existsSync(dirname(p)) || p.includes('.kilocode')) {
    updateJsonConfig(p, 'munch');
  }
});

// OpenCode config paths
const opencodePaths = [
  join(homedir, '.config/opencode/opencode.json'),
  join(homedir, '.opencode/opencode.json'),
];
opencodePaths.forEach((p) => {
  if (existsSync(dirname(p)) || p.includes('.opencode')) {
    updateOpenCodeConfig(p);
  }
});

// Codex config paths
const codexPaths = [
  join(homedir, '.codex/config.toml'),
  join(homedir, '.config/codex/config.toml'),
];
codexPaths.forEach((p) => {
  if (existsSync(dirname(p)) || p.includes('.codex')) {
    updateCodexConfig(p);
  }
});

// Install Codex plugin from the local-plugins marketplace
try {
  console.log('\nInstalling Munch plugin in Codex...');
  execSync('codex plugin add munch@local-plugins', { stdio: 'inherit' });
  console.log('✓ Munch plugin installed in Codex successfully.');
} catch (err) {
  console.warn('! Failed to install Munch plugin in Codex:', err.message);
}

// ──────────────────────────────────────────────
// 6. Configure Windows Registry (IFEO Redirection)
// ──────────────────────────────────────────────
if (process.platform === 'win32') {
  console.log('\nConfiguring Windows Registry to redirect powershell.exe to pwsh.exe...');
  const redirectScriptPath = join(homedir, '.gemini/skills/munch/scripts/powershell_redirect.js');
  const tempPs1Path = join(__dirname, 'temp_setup_registry.ps1');
  
  const psContent = [
    `$regKey = "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\powershell.exe"`,
    `$debuggerVal = '"${process.execPath}" "${redirectScriptPath}"'`,
    `if (-not (Test-Path $regKey)) {`,
    `    New-Item -Path $regKey -Force`,
    `}`,
    `Set-ItemProperty -Path $regKey -Name Debugger -Value $debuggerVal -Force`,
  ].join('\r\n');
  
  try {
    writeFileSync(tempPs1Path, psContent, 'utf8');
    console.log('Spawning elevated registry configuration prompt...');
    const args = `-NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \\"${tempPs1Path}\\"' -Verb RunAs -Wait"`;
    execSync(`powershell ${args}`, { stdio: 'inherit' });
    console.log('✓ Registry redirection configured successfully.');
  } catch (err) {
    console.error('✗ Failed to configure registry redirection:', err.message);
  } finally {
    try {
      if (existsSync(tempPs1Path)) {
        unlinkSync(tempPs1Path);
      }
    } catch (e) {}
  }
}

console.log('\n======================================================');
console.log('⟦§MUNCH AUTO-INSTALL COMPLETE⟧');
console.log('Installed files:');
console.log(`  • Skill: ~/.gemini/config/plugins/munch/skills/munch/SKILL.md`);
console.log(`  • Skill: ~/.claude/skills/munch/SKILL.md`);
console.log(`  • MCP server: Local command running via node`);
console.log('Restart your AI Agent to load the changes.');
console.log('======================================================\n');
