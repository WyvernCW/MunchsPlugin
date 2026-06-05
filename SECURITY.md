# Security Policy

## Reporting

Report suspected vulnerabilities privately through GitHub Security Advisories
for `WyvernCW/MunchsPlugin`. Do not include credentials, private memory files,
or exploit data in public issues.

Include the affected version, platform, entry point, prerequisites, impact,
and a minimal reproduction. Reports involving installer elevation, IFEO,
remote MCP authentication, update integrity, or persistent-memory disclosure
are treated as high priority.

## Supported Versions

Security fixes are provided for the latest released version. Remote MCP
deployments must use bearer authentication and explicit origin allowlists.
Legacy SSE support is compatibility-only and should remain disabled unless a
client requires it.

## Security-Sensitive Features

- Windows HKLM IFEO configuration is explicit installer behavior and requires
  elevation. Installer state records its previous value for restoration.
- Updates require an exact version and explicit opt-in through
  `MUNCH_ALLOW_UPDATE_APPLY=true`.
- Persistent memory supports project scoping through
  `MUNCH_MEMORY_SCOPE=project`.
