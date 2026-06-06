import { useState } from 'react';

import logoUrl from '../munch_plugin_logo.svg';

const githubUrl = 'https://github.com/WyvernCW/MunchsPlugin';
const mcpUrl = 'https://munch-ashy.vercel.app/api/mcp';

async function writeClipboard(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch (clipboardError) {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();

    try {
      return document.execCommand('copy');
    } catch (fallbackError) {
      console.warn('Clipboard copy failed', { clipboardError, fallbackError });
      return false;
    } finally {
      textarea.remove();
    }
  }
}

function Icon({ name }) {
  const paths = {
    route: (
      <>
        <path d="M5 7h5l3 3h6" />
        <path d="M5 17h5l3-3h6" />
        <path d="M17 7l2 3-2 3M17 11l2 3-2 3" />
        <circle cx="5" cy="7" r="1.5" />
        <circle cx="5" cy="17" r="1.5" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3.5 19 6v5.4c0 4.4-2.8 7.5-7 9.1-4.2-1.6-7-4.7-7-9.1V6l7-2.5Z" />
        <path d="m8.6 12 2.1 2.1 4.7-5" />
        <path d="M12 6.8v2" />
      </>
    ),
    memory: (
      <>
        <path d="M8 4.5h8M8 19.5h8M4.5 8v8M19.5 8v8" />
        <rect x="7" y="7" width="10" height="10" rx="2" />
        <path d="M10 10h4M10 14h2" />
        <path d="M8 2.5v3M12 2.5v3M16 2.5v3M8 18.5v3M12 18.5v3M16 18.5v3" />
      </>
    ),
    loop: (
      <>
        <path d="M6.2 8.2A7 7 0 0 1 18 7l1.5 2.5" />
        <path d="M19.5 5.5v4h-4" />
        <path d="M17.8 15.8A7 7 0 0 1 6 17l-1.5-2.5" />
        <path d="M4.5 18.5v-4h4" />
        <path d="m9.5 12 1.6 1.6 3.5-3.7" />
      </>
    ),
    graph: (
      <>
        <circle cx="6" cy="6" r="2.2" />
        <circle cx="18" cy="7" r="2.2" />
        <circle cx="8" cy="18" r="2.2" />
        <circle cx="18" cy="17" r="2.2" />
        <path d="m8 7 7.8-.1M7 8l.8 7.8M10 17.8l5.8-.6M17.5 9.2l.3 5.6M8 7.5l8.3 7.9" />
      </>
    ),
    terminal: (
      <>
        <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
        <path d="m7 9 3 3-3 3M12.5 15H17" />
        <path d="M3.5 8h17" />
        <circle cx="6" cy="6.3" r=".45" fill="currentColor" stroke="none" />
        <circle cx="8" cy="6.3" r=".45" fill="currentColor" stroke="none" />
      </>
    ),
    arrow: <path d="M5 12h13M14 7l5 5-5 5" />,
    copy: (
      <>
        <rect x="8" y="8" width="11" height="11" rx="2" />
        <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
      </>
    ),
  };
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

const capabilities = [
  ['route', 'Context routing', 'Loads only the references that match the task, language, and risk.'],
  ['loop', 'Build-test-loop', 'Turns requirements into implementation, verification, correction, and a clear ship gate.'],
  ['shield', 'Security kernel', 'Checks trust boundaries, input handling, dependencies, and common vulnerability classes.'],
  ['memory', 'Persistent learning', 'Records resolved failures, preferences, regression fixes, and long-running task state.'],
];

function App() {
  const [copied, setCopied] = useState('');
  const copy = async (value, label) => {
    const didCopy = await writeClipboard(value);
    setCopied(didCopy ? label : `error:${label}`);
    window.setTimeout(() => setCopied(''), 1400);
  };

  return (
    <div className="site-shell">
      <header className="nav">
        <a className="brand" href="#top" aria-label="Munch home">
          <img src={logoUrl} alt="" />
          <span>Munch</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#how">How it works</a>
          <a href="#capabilities">Capabilities</a>
          <a href="#install">Install</a>
        </nav>
        <a className="nav-action" href={githubUrl} target="_blank" rel="noreferrer">
          GitHub <Icon name="arrow" />
        </a>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <h1>Make coding agents remember what matters.</h1>
            <p>
              Munch is an open-source skill and MCP server that gives AI coding agents
              structured verification, anti-regression memory, security checks, and
              task-specific engineering guidance.
            </p>
            <div className="hero-actions">
              <a className="button primary" href={githubUrl} target="_blank" rel="noreferrer">
                View on GitHub <Icon name="arrow" />
              </a>
              <a className="button secondary" href="#install">Connect MCP</a>
            </div>
          </div>

          <div className="system-map" aria-label="Munch system flow">
            <div className="map-head">
              <span>Agent request</span>
              <span className="live-dot">runtime online</span>
            </div>
            <div className="map-core">
              <img src={logoUrl} alt="Munch" />
              <div><strong>Munch router</strong><span>classify · load · verify</span></div>
            </div>
            <div className="map-branches">
              <div><Icon name="shield" /><span>Security</span></div>
              <div><Icon name="memory" /><span>Memory</span></div>
              <div><Icon name="loop" /><span>BTL loop</span></div>
            </div>
            <div className="map-output"><Icon name="graph" /><span>Evidence-backed output</span></div>
          </div>
        </section>

        <div className="compatibility" aria-label="Compatible agents">
          <span>Works with</span>
          <strong>Codex</strong><strong>Claude</strong><strong>OpenCode</strong>
          <strong>KiloCode</strong><strong>Antigravity</strong>
        </div>

        <section className="split-section" id="how">
          <div>
            <h2>A reliability layer, not another chatbot.</h2>
          </div>
          <div className="section-copy">
            <p>
              Munch sits between your request and the agent’s execution. It routes the
              smallest useful reference set, keeps prior decisions from drifting, and
              requires verification before work is treated as complete.
            </p>
            <div className="process-line">
              <span>01 Understand</span><span>02 Route</span><span>03 Build</span>
              <span>04 Verify</span><span>05 Remember</span>
            </div>
          </div>
        </section>

        <section className="capability-section" id="capabilities">
          <div className="section-heading">
            <h2>Built for the full engineering loop.</h2>
            <p>One system for implementation, review, debugging, architecture, security, and UI work.</p>
          </div>
          <div className="capability-list">
            {capabilities.map(([icon, title, description]) => (
              <article key={title}>
                <div className="icon-frame"><Icon name={icon} /></div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="install-section" id="install">
          <div className="install-copy">
            <h2>Install locally or connect remotely.</h2>
            <p>
              Use the complete local skill with durable memory, or connect any compatible
              MCP client to the hosted Streamable HTTP endpoint.
            </p>
            <a href={`${githubUrl}#quick-install`} target="_blank" rel="noreferrer">
              Read installation guide <Icon name="arrow" />
            </a>
          </div>
          <div className="terminal-panel">
            <div className="terminal-title"><Icon name="terminal" /><span>Local install</span></div>
            <code>npm install -g --ignore-scripts git+https://github.com/WyvernCW/MunchsPlugin.git{'\n'}munch-setup setup --codex-only --no-ifeo</code>
            <button type="button" onClick={() => copy('npm install -g --ignore-scripts git+https://github.com/WyvernCW/MunchsPlugin.git\nmunch-setup setup --codex-only --no-ifeo', 'install')}>
              <Icon name="copy" />{' '}
              {copied === 'install'
                ? 'Copied'
                : copied === 'error:install'
                  ? 'Copy failed'
                  : 'Copy'}
            </button>
            <div className="terminal-divider" />
            <div className="terminal-title"><Icon name="route" /><span>Remote MCP endpoint</span></div>
            <code>{mcpUrl}</code>
            <button type="button" onClick={() => copy(mcpUrl, 'mcp')}>
              <Icon name="copy" />{' '}
              {copied === 'mcp'
                ? 'Copied'
                : copied === 'error:mcp'
                  ? 'Copy failed'
                  : 'Copy'}
            </button>
          </div>
        </section>
      </main>

      <footer>
        <a className="brand" href="#top"><img src={logoUrl} alt="" /><span>Munch</span></a>
        <p>Open source under the MIT License.</p>
        <a href={githubUrl} target="_blank" rel="noreferrer">WyvernCW/MunchsPlugin</a>
      </footer>
    </div>
  );
}

export default App;
