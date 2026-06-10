#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Post-install setup for Munch. Run once after MSI install.
.DESCRIPTION
  - Installs npm dependencies
  - Compiles TypeScript
  - Registers the skill with AI agents
  - Creates the auto-update scheduled task
  - Adds Munch to PATH
.PARAMETER InstallDir
  The installation directory (set by the MSI).
#>

param(
  [string]$InstallDir = "$env:LOCALAPPDATA\Programs\Munch"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $InstallDir)) {
  Write-Error "Install directory not found: $InstallDir"
  exit 1
}

Set-Location $InstallDir

Write-Host "Munch Post-Install Setup"
Write-Host "Install Dir: $InstallDir"

# Step 1: Check Node.js
$nodeVersion = node --version 2>$null
if (-not $nodeVersion -or $nodeVersion -notmatch 'v(\d+)') {
  Write-Host "Node.js not found or too old. Installing Node.js 22..."

  $arch = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
  $nodeUrl = "https://nodejs.org/dist/v22.14.0/node-v22.14.0-$arch.msi"
  $msiPath = "$env:TEMP\node-install.msi"

  try {
    Invoke-WebRequest -Uri $nodeUrl -OutFile $msiPath -UseBasicParsing
    Start-Process msiexec.exe -Wait -ArgumentList "/i `"$msiPath`" /quiet /norestart"
    Remove-Item $msiPath -Force

    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
               [System.Environment]::GetEnvironmentVariable("Path", "User")

    Write-Host "Node.js installed."
  } catch {
    Write-Error "Failed to install Node.js: $_"
    exit 1
  }
}

Write-Host "Node.js: $(node --version)"

# Step 2: npm install dependencies
if (Test-Path "$InstallDir\package-lock.json") {
  Write-Host "Installing root dependencies..."
  npm ci --omit=dev --no-fund --no-audit 2>&1 | Out-Null
}

if (Test-Path "$InstallDir\mcp-server\package-lock.json") {
  Write-Host "Installing MCP server dependencies..."
  Set-Location "$InstallDir\mcp-server"
  npm ci --omit=dev --no-fund --no-audit 2>&1 | Out-Null
  Set-Location $InstallDir
}

# Step 3: Compile TypeScript
if (Test-Path "$InstallDir\mcp-server\tsconfig.json") {
  Write-Host "Compiling TypeScript..."
  npx --offline tsc -p mcp-server/tsconfig.json 2>&1 | Out-Null
}

# Step 4: Register skill/agent configs
if (Test-Path "$InstallDir\install.js") {
  Write-Host "Registering Munch with AI agents..."
  try {
    node install.js setup --skip-build 2>&1 | Out-Null
    Write-Host "Registration complete."
  } catch {
    Write-Warning "Registration failed: $_"
  }
}

# Step 5: Add to PATH if not already there
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$InstallDir*") {
  Write-Host "Adding Munch to PATH..."
  $newPath = "$InstallDir;$InstallDir\scripts;$userPath"
  [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
  $env:Path = $newPath
}

# Step 6: Create auto-update scheduled task
$taskName = "Munch Auto-Update"
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if (-not $existing) {
  Write-Host "Creating scheduled task: $taskName"
  $action = New-ScheduledTaskAction -Execute "node" -Argument "`"$InstallDir\scripts\auto-update.mjs`"" -WorkingDirectory $InstallDir
  $trigger = New-ScheduledTaskTrigger -Daily -At 10:00AM -RepetitionInterval (New-TimeSpan -Hours 24)
  $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Limited
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Force | Out-Null
  Write-Host "Scheduled task created."
} else {
  Write-Host "Scheduled task already exists."
}

Write-Host "`nMunch setup complete!"
Write-Host "The auto-updater will check for updates daily."
