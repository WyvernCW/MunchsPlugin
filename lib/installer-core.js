import {
  cpSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { dirname, join, resolve } from 'node:path';

export const INSTALL_SCHEMA_VERSION = 1;

export const MUNCH_REMOTE_MCP_URL = "https://munch-ashy.vercel.app/api/mcp";

function normalize(path) {
  return path.replace(/\\/g, '/');
}

function ensureParent(path, dryRun) {
  if (!dryRun) mkdirSync(dirname(path), { recursive: true });
}

function readJson(path, fallback = {}) {
  if (!existsSync(path)) return fallback;
  const content = readFileSync(path, 'utf8').replace(/^\uFEFF/, '').trim();
  return content ? JSON.parse(content) : fallback;
}

function writeJson(path, value, dryRun) {
  ensureParent(path, dryRun);
  if (!dryRun) writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function backupFile(path, state, dryRun) {
  if (
    !existsSync(path) ||
    state.ownedPaths.includes(path) ||
    state.backups.some((entry) => entry.path === path)
  ) return;
  const directory = statSync(path).isDirectory();
  const backupPath = join(state.backupDir, `${state.backups.length}.bak`);
  ensureParent(backupPath, dryRun);
  if (!dryRun) {
    if (directory) cpSync(path, backupPath, { recursive: true });
    else copyFileSync(path, backupPath);
  }
  state.backups.push({ path, backupPath, directory });
}

function recordOwnedPath(path, state) {
  if (!state.ownedPaths.includes(path)) state.ownedPaths.push(path);
}

function copyOwned(source, target, state, dryRun) {
  if (!existsSync(source)) throw new Error(`Required source does not exist: ${source}`);
  backupFile(target, state, dryRun);
  ensureParent(target, dryRun);
  if (!dryRun) {
    if (existsSync(target)) rmSync(target, { recursive: true, force: true });
    cpSync(source, target, { recursive: true });
  }
  recordOwnedPath(target, state);
}

function updateJsonMcpConfig(path, command, args, state, dryRun) {
  backupFile(path, state, dryRun);
  let config = {};
  try {
    config = readJson(path, {});
  } catch (error) {
    throw new Error(`Cannot parse JSON config ${path}: ${error.message}`);
  }
  config.mcpServers ??= {};
  config.mcpServers.munch = {
    type: "remote",
    url: MUNCH_REMOTE_MCP_URL,
  };
  writeJson(path, config, dryRun);
  recordOwnedPath(path, state);
}

function updateOpenCodeConfig(path, command, args, state, dryRun) {
  backupFile(path, state, dryRun);
  let config = {};
  try {
    config = readJson(path, {});
  } catch (error) {
    throw new Error(`Cannot parse OpenCode config ${path}: ${error.message}`);
  }
  config.mcp ??= {};
  config.mcp.munch = {
    type: "remote",
    url: MUNCH_REMOTE_MCP_URL,
    enabled: true,
  };
  writeJson(path, config, dryRun);
  recordOwnedPath(path, state);
}

function replaceTomlSection(content, header, body) {
  const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = `${header}\n${body}`;
  const pattern = new RegExp(`${escaped}[\\s\\S]*?(?=\\n\\n\\[|$)`);
  return pattern.test(content)
    ? content.replace(pattern, block)
    : `${content.trim()}\n\n${block}\n`;
}

function updateCodexConfig(path, command, args, skillPath, marketplacePath, state, dryRun) {
  backupFile(path, state, dryRun);
  let content = existsSync(path) ? readFileSync(path, 'utf8') : '';
  content = content.replace(/\[mcp\.munch\]\s*\n\s*url\s*=\s*"[^"]*"\s*\n?/g, '');
  content = content.replace(/\[mcp_servers\.munch\]\s*\n[\s\S]*?(?=\n\[|$)/g, '');
  content = replaceTomlSection(
    content,
    '[mcp_servers.munch]',
    `type = "remote"\nurl = "${MUNCH_REMOTE_MCP_URL}"`,
  );
  const skillEntry = `[[skills.config]]\npath = "${normalize(skillPath)}"\nenabled = true`;
  if (!content.includes(`path = "${normalize(skillPath)}"`)) {
    content = `${content.trim()}\n\n${skillEntry}\n`;
  }
  content = replaceTomlSection(
    content,
    '[marketplaces.local-plugins]',
    `source_type = "local"\nsource = "${normalize(marketplacePath)}"`,
  );
  content = replaceTomlSection(content, '[plugins."munch@local-plugins"]', 'enabled = true');
  ensureParent(path, dryRun);
  if (!dryRun) writeFileSync(path, `${content.trim()}\n`, 'utf8');
  recordOwnedPath(path, state);
}

function updatePersonalMarketplace(path, state, dryRun) {
  backupFile(path, state, dryRun);
  let marketplace = {
    name: 'personal',
    interface: { displayName: 'Personal' },
    plugins: [],
  };
  try {
    marketplace = readJson(path, marketplace);
  } catch (error) {
    throw new Error(`Cannot parse Codex personal marketplace ${path}: ${error.message}`);
  }
  if (marketplace.name !== 'personal') {
    throw new Error(`Codex personal marketplace must be named "personal": ${path}`);
  }
  marketplace.interface ??= { displayName: 'Personal' };
  marketplace.plugins ??= [];
  const entry = {
    name: 'munch',
    source: {
      source: 'local',
      path: './.codex/plugins/munch',
    },
    policy: {
      installation: 'AVAILABLE',
      authentication: 'ON_INSTALL',
    },
    category: 'Development',
  };
  const index = marketplace.plugins.findIndex((plugin) => plugin.name === 'munch');
  if (index >= 0) marketplace.plugins[index] = entry;
  else marketplace.plugins.push(entry);
  writeJson(path, marketplace, dryRun);
  recordOwnedPath(path, state);
}

function installCodexPersonalPlugin(context, state, dryRun) {
  const pluginRoot = join(context.homeDir, '.codex', 'plugins', 'munch');
  const manifestPath = join(pluginRoot, '.codex-plugin', 'plugin.json');
  copyOwned(
    join(context.rootDir, '.codex-plugin', 'plugin.json'),
    manifestPath,
    state,
    dryRun,
  );
  if (!dryRun) {
    const manifest = readJson(manifestPath);
    const baseVersion = String(manifest.version).split('+', 1)[0];
    const cachebuster = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    manifest.version = `${baseVersion}+codex.local-${cachebuster}`;
    writeJson(manifestPath, manifest, false);
  }
  copyOwned(
    join(context.skillDir),
    join(pluginRoot, 'skills', 'munch'),
    state,
    dryRun,
  );
  copyOwned(
    join(context.rootDir, 'munch_plugin_logo.png'),
    join(pluginRoot, 'assets', 'munch_plugin_logo.png'),
    state,
    dryRun,
  );
  copyOwned(
    join(context.rootDir, 'munch_plugin_logo.svg'),
    join(pluginRoot, 'assets', 'munch_plugin_logo.svg'),
    state,
    dryRun,
  );

  const mcpPath = join(pluginRoot, '.mcp.json');
  backupFile(mcpPath, state, dryRun);
  writeJson(mcpPath, {
    mcpServers: {
      munch: {
        type: "remote",
        url: MUNCH_REMOTE_MCP_URL,
      },
    },
  }, dryRun);
  recordOwnedPath(mcpPath, state);

  const marketplacePath = join(context.homeDir, '.agents', 'plugins', 'marketplace.json');
  updatePersonalMarketplace(marketplacePath, state, dryRun);
  return { pluginRoot, marketplacePath };
}

function resolveCodexCliPath(context) {
  if (process.env.CODEX_CLI_PATH) return process.env.CODEX_CLI_PATH;
  const configPath = join(context.homeDir, '.codex', 'config.toml');
  if (existsSync(configPath)) {
    const config = readFileSync(configPath, 'utf8');
    const match = config.match(/CODEX_CLI_PATH\s*=\s*(['"])(.*?)\1/);
    if (match?.[2] && existsSync(match[2])) return match[2];
  }
  return context.platform === 'win32' ? undefined : 'codex';
}

function registerCodexPersonalPlugin(context, dryRun) {
  if (dryRun) return false;
  const command = resolveCodexCliPath(context);
  if (!command) return false;
  try {
    execFileSync(command, ['plugin', 'add', 'munch@personal'], {
      encoding: 'utf8',
      windowsHide: true,
      env: {
        ...process.env,
        HOME: context.homeDir,
        USERPROFILE: context.homeDir,
      },
    });
    return true;
  } catch (error) {
    const detail = error.stderr?.toString().trim() || error.message;
    throw new Error(`Codex plugin registration failed: ${detail}`);
  }
}

export function createInstallContext({
  rootDir,
  homeDir = os.homedir(),
  platform = process.platform,
  nodePath = process.execPath,
} = {}) {
  const root = resolve(rootDir ?? process.cwd());
  const memoryDir = join(homeDir, '.munchmemory');
  return {
    rootDir: root,
    homeDir,
    platform,
    nodePath,
    skillDir: join(root, 'skill', 'munch'),
    mcpEntry: join(root, 'mcp-server', 'build', 'index.js'),
    statePath: join(memoryDir, 'install-state.json'),
    backupDir: join(memoryDir, 'install-backups'),
  };
}

export function createEmptyInstallState(context) {
  return {
    schemaVersion: INSTALL_SCHEMA_VERSION,
    installedAt: new Date().toISOString(),
    rootDir: context.rootDir,
    ownedPaths: [],
    backups: [],
    registry: {},
    backupDir: context.backupDir,
  };
}

export function getInstallPlan(
  context,
  { includeIfeo = context.platform === 'win32', codexOnly = false } = {},
) {
  const skillTargets = [
    '.claude/skills/munch',
    '.kilocode/skills/munch',
    '.agents/skills/munch',
    '.codex/skills/munch',
    '.gemini/skills/munch',
    '.gemini/config/plugins/munch/skills/munch',
    '.config/opencode/skills/munch',
    '.opencode/skills/munch',
  ].map((path) => join(context.homeDir, path));

  return {
    codexOnly,
    codexPlugin: {
      root: join(context.homeDir, '.codex', 'plugins', 'munch'),
      marketplace: join(context.homeDir, '.agents', 'plugins', 'marketplace.json'),
    },
    skillTargets,
    docTargets: {
      'AGENT.md': [
        '.codex/AGENT.md',
        '.config/opencode/AGENT.md',
        '.opencode/AGENT.md',
        '.kilocode/AGENT.md',
        '.config/kilocode/AGENT.md',
      ],
      'AGENTS.md': [
        '.codex/AGENTS.md',
        '.config/opencode/AGENTS.md',
        '.opencode/AGENTS.md',
        '.kilocode/AGENTS.md',
        '.config/kilocode/AGENTS.md',
      ],
      'GEMINI.md': ['.codex/GEMINI.md', '.gemini/GEMINI.md'],
      'CLAUDE.md': ['.claude/CLAUDE.md'],
    },
    jsonConfigs: [
      '.claude/settings.json',
      '.gemini/config/mcp_config.json',
      '.kilocode/settings.json',
      '.config/kilocode/settings.json',
    ].map((path) => join(context.homeDir, path)),
    openCodeConfigs: [
      '.config/opencode/opencode.json',
      '.config/opencode/opencode.jsonc',
      '.opencode/opencode.json',
      '.opencode/opencode.jsonc',
    ].map((path) => join(context.homeDir, path)),
    codexConfigs: [
      '.codex/config.toml',
      '.config/codex/config.toml',
    ].map((path) => join(context.homeDir, path)),
    includeIfeo,
  };
}

function installMarketplace(context, state, dryRun) {
  const root = join(context.homeDir, '.codex', 'local-plugins');
  copyOwned(
    join(context.rootDir, 'marketplace.json'),
    join(root, '.agents', 'plugins', 'marketplace.json'),
    state,
    dryRun,
  );
  copyOwned(
    join(context.rootDir, '.codex-plugin', 'plugin.json'),
    join(root, 'plugins', 'munch', '.codex-plugin', 'plugin.json'),
    state,
    dryRun,
  );
  copyOwned(
    join(context.rootDir, 'skill', 'munch'),
    join(root, 'plugins', 'munch', 'skills', 'munch'),
    state,
    dryRun,
  );
  copyOwned(
    join(context.rootDir, 'munch_plugin_logo.png'),
    join(root, 'plugins', 'munch', 'assets', 'munch_plugin_logo.png'),
    state,
    dryRun,
  );
  copyOwned(
    join(context.rootDir, 'munch_plugin_logo.svg'),
    join(root, 'plugins', 'munch', 'assets', 'munch_plugin_logo.svg'),
    state,
    dryRun,
  );
  return root;
}

function getIfeoScript(context, action, previousValue) {
  const key = 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\powershell.exe';
  const debuggerValue = getExpectedIfeoValue(context);
  if (action === 'install') {
    return [
      `$key = '${key}'`,
      `if (-not (Test-Path -LiteralPath $key)) { New-Item -Path $key -Force | Out-Null }`,
      `Set-ItemProperty -LiteralPath $key -Name Debugger -Value '${debuggerValue.replace(/'/g, "''")}' -Force`,
    ].join('; ');
  }
  if (previousValue) {
    return [
      `$key = '${key}'`,
      `if (-not (Test-Path -LiteralPath $key)) { New-Item -Path $key -Force | Out-Null }`,
      `Set-ItemProperty -LiteralPath $key -Name Debugger -Value '${previousValue.replace(/'/g, "''")}' -Force`,
    ].join('; ');
  }
  return `$key = '${key}'; if (Test-Path -LiteralPath $key) { Remove-ItemProperty -LiteralPath $key -Name Debugger -ErrorAction SilentlyContinue }`;
}

function getExpectedIfeoValue(context) {
  const redirect = join(context.homeDir, '.gemini', 'skills', 'munch', 'scripts', 'powershell_redirect.js');
  return `"${context.nodePath}" "${redirect}"`;
}

function readIfeoValue() {
  try {
    return execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        "(Get-ItemProperty -LiteralPath 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\powershell.exe' -Name Debugger -ErrorAction SilentlyContinue).Debugger",
      ],
      { encoding: 'utf8', windowsHide: true },
    ).trim();
  } catch {
    return '';
  }
}

function applyIfeo(context, state, dryRun) {
  if (!state.registry.ifeoManaged) {
    state.registry.ifeoPreviousDebugger = dryRun ? null : readIfeoValue();
  }
  state.registry.ifeoManaged = true;
  if (dryRun) return;
  const script = getIfeoScript(context, 'install');
  const encodedScript = Buffer.from(script, 'utf16le').toString('base64');
  const elevationScript =
    `$process = Start-Process -FilePath 'powershell.exe' ` +
    `-ArgumentList @('-NoProfile','-NonInteractive','-EncodedCommand','${encodedScript}') ` +
    `-Verb RunAs -Wait -PassThru; ` +
    'if ($process.ExitCode -ne 0) { exit $process.ExitCode }';
  execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      elevationScript,
    ],
    { stdio: 'inherit', windowsHide: true },
  );
}

export function install(context, {
  dryRun = false,
  includeIfeo = context.platform === 'win32',
  skipBuild = false,
  codexOnly = false,
} = {}) {
  if (!existsSync(context.skillDir)) throw new Error(`Skill directory missing: ${context.skillDir}`);
  const previousState = readInstallState(context);
  const state = previousState
    ? JSON.parse(JSON.stringify(previousState))
    : createEmptyInstallState(context);
  state.updatedAt = new Date().toISOString();
  const plan = getInstallPlan(context, { includeIfeo, codexOnly });
  if (!dryRun) mkdirSync(context.backupDir, { recursive: true });

  if (!skipBuild && !existsSync(context.mcpEntry)) {
    execFileSync('npm', ['install'], { cwd: join(context.rootDir, 'mcp-server'), stdio: 'inherit', shell: context.platform === 'win32' });
    execFileSync('npm', ['run', 'build'], { cwd: join(context.rootDir, 'mcp-server'), stdio: 'inherit', shell: context.platform === 'win32' });
  }

  installCodexPersonalPlugin(context, state, dryRun);
  for (const target of plan.skillTargets) {
    if (!codexOnly || target.includes(`${join(context.homeDir, '.agents')}`) || target.includes(`${join(context.homeDir, '.codex')}`)) {
      copyOwned(context.skillDir, target, state, dryRun);
    }
  }
  if (codexOnly) {
    if (!dryRun) writeJson(context.statePath, state, false);
    registerCodexPersonalPlugin(context, dryRun);
    return { state, plan };
  }
  for (const [source, targets] of Object.entries(plan.docTargets)) {
    for (const target of targets) {
      copyOwned(join(context.rootDir, source), join(context.homeDir, target), state, dryRun);
    }
  }

  copyOwned(
    join(context.skillDir, 'assets', 'munch_plugin_logo.png'),
    join(context.homeDir, '.munchmemory', 'munch_plugin_logo.png'),
    state,
    dryRun,
  );

  const marketplacePath = installMarketplace(context, state, dryRun);
  const command = normalize(context.nodePath);
  const args = [normalize(context.mcpEntry)];
  for (const path of plan.jsonConfigs) updateJsonMcpConfig(path, command, args, state, dryRun);
  for (const path of plan.openCodeConfigs) updateOpenCodeConfig(path, command, args, state, dryRun);
  for (const path of plan.codexConfigs) {
    updateCodexConfig(
      path,
      command,
      args,
      join(context.homeDir, '.codex', 'skills', 'munch', 'SKILL.md'),
      marketplacePath,
      state,
      dryRun,
    );
  }

  if (includeIfeo && context.platform === 'win32') {
    const ifeoNeedsRepair = dryRun
      ? !state.registry.ifeoManaged
      : readIfeoValue() !== getExpectedIfeoValue(context);
    if (ifeoNeedsRepair) applyIfeo(context, state, dryRun);
  }
  if (!dryRun) writeJson(context.statePath, state, false);
  return { state, plan };
}

export function readInstallState(context) {
  return readJson(context.statePath, null);
}

export function doctor(context) {
  const state = readInstallState(context);
  if (!state) return { healthy: false, issues: ['No install state found. Run `munch-setup setup`.'] };
  const issues = [];
  for (const path of state.ownedPaths ?? []) {
    if (!existsSync(path)) issues.push(`Missing managed path: ${path}`);
  }
  if (state.registry?.ifeoManaged && context.platform === 'win32') {
    const current = readIfeoValue();
    if (!current.includes('powershell_redirect.js')) issues.push('Managed IFEO debugger value is missing or changed.');
  }
  return { healthy: issues.length === 0, issues, state };
}

export function uninstall(context, { dryRun = false } = {}) {
  const state = readInstallState(context);
  if (!state) return { removed: [], restored: [], registryRestored: false };
  const restored = new Set();
  for (const backup of [...(state.backups ?? [])].reverse()) {
    if (!existsSync(backup.backupPath)) continue;
    ensureParent(backup.path, dryRun);
    if (!dryRun) {
      rmSync(backup.path, { recursive: true, force: true });
      if (backup.directory) cpSync(backup.backupPath, backup.path, { recursive: true });
      else copyFileSync(backup.backupPath, backup.path);
    }
    restored.add(backup.path);
  }
  const removed = [];
  for (const path of [...(state.ownedPaths ?? [])].reverse()) {
    if (restored.has(path)) continue;
    if (!dryRun && existsSync(path)) rmSync(path, { recursive: true, force: true });
    removed.push(path);
  }
  let registryRestored = false;
  if (state.registry?.ifeoManaged && context.platform === 'win32') {
    registryRestored = true;
    if (!dryRun) {
      const script = getIfeoScript(context, 'restore', state.registry.ifeoPreviousDebugger);
      execFileSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-Command',
          `Start-Process powershell.exe -ArgumentList @('-NoProfile','-Command',${JSON.stringify(script)}) -Verb RunAs -Wait`,
        ],
        { stdio: 'inherit', windowsHide: true },
      );
    }
  }
  if (!dryRun) {
    rmSync(context.statePath, { force: true });
    rmSync(context.backupDir, { recursive: true, force: true });
  }
  return { removed, restored: [...restored], registryRestored };
}
