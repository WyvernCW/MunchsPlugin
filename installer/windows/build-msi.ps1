#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Builds the Munch MSI installer using WiX Toolset v5.
.DESCRIPTION
  Installs WiX if missing, harvests source files, compiles the .wxs,
  links the MSI, and signs it.
.PARAMETER SourceDir
  Root directory of the Munch project. Defaults to git root.
.PARAMETER OutputDir
  Where to place the final MSI. Defaults to installer/windows.
.PARAMETER PfxPath
  Optional path to code signing certificate .pfx file.
.PARAMETER PfxPassword
  Optional password for the .pfx file.
.EXAMPLE
  .\build-msi.ps1 -SourceDir C:\Users\me\MunchsPlugin
#>

param(
  [string]$SourceDir,
  [string]$OutputDir,
  [string]$PfxPath,
  [string]$PfxPassword
)

$ErrorActionPreference = "Stop"

# Determine source directory
if (-not $SourceDir) {
  $SourceDir = git rev-parse --show-toplevel 2>$null
  if (-not $SourceDir) {
    $SourceDir = Resolve-Path "$PSScriptRoot\..\.."
  }
}

if (-not (Test-Path $SourceDir)) {
  Write-Error "Source directory not found: $SourceDir"
  exit 1
}

$SourceDir = Resolve-Path $SourceDir
$OutputDir = if ($OutputDir) { Resolve-Path $OutputDir } else { "$PSScriptRoot" }

Write-Host "Building Munch MSI from: $SourceDir"

# Read version from package.json
$pkgJson = Get-Content "$SourceDir\package.json" | ConvertFrom-Json
$productVersion = $pkgJson.version
Write-Host "Product version: $productVersion"

# Ensure .last-commit exists (for auto-update tracking)
if (-not (Test-Path "$SourceDir\.last-commit")) {
  Set-Content "$SourceDir\.last-commit" "0000000000000"
}

# Ensure WiX v5 is installed
$wix = "$env:USERPROFILE\.dotnet\tools\wix.exe"
if (-not (Test-Path $wix)) {
  Write-Host "Installing WiX Toolset v5..."
  dotnet tool install --global wix --version 5.* 2>&1 | Out-Null
  if (-not (Test-Path $wix)) {
    Write-Error "Failed to install WiX. Install manually: dotnet tool install --global wix"
    exit 1
  }
}

Write-Host "WiX: $(& $wix --version)"

# Generate file manifest (WiX v5 removed heat.exe)
Write-Host "Generating file manifest..."
$harvestFile = "$OutputDir\main-files.wxs"
& "$PSScriptRoot\generate-harvest.ps1" -SourceDir $SourceDir -OutputFile $harvestFile
if ($LASTEXITCODE -ne 0) {
  Write-Error "File manifest generation failed"
  exit 1
}

# Build the MSI
Write-Host "Building MSI..."
$srcDir = if ($SourceDir.EndsWith('\')) { $SourceDir } else { $SourceDir + '\' }
$msiPath = "$OutputDir\munch-$productVersion.msi"
& $wix build "$PSScriptRoot\builder.wxs" $harvestFile -d "SourceDir=$srcDir" -d "ProductVersion=$productVersion" -o $msiPath -arch x64

if ($LASTEXITCODE -ne 0) {
  Write-Error "MSI build failed"
  exit 1
}

# Sign the MSI if a certificate is provided
if ($PfxPath -and (Test-Path $PfxPath)) {
  Write-Host "Signing MSI..."
  $signParams = @(
    "sign", "/fd", "SHA256", "/a"
  )
  if ($PfxPassword) {
    $signParams += "/f", "`"$PfxPath`""
    $signParams += "/p", "`"$PfxPassword`""
  }
  $signParams += "`"$msiPath`""

  & "signtool" $signParams
  
  if ($LASTEXITCODE -eq 0) {
    Write-Host "MSI signed successfully"
  } else {
    Write-Warning "Signing failed (non-fatal)"
  }
}

Write-Host "`nMSI built: $msiPath"
Write-Host "Size: $((Get-Item $msiPath).Length / 1MB) MB"

# Generate SHA256 hash
$hash = Get-FileHash $msiPath -Algorithm SHA256
Set-Content "$msiPath.sha256" $hash.Hash
Write-Host "SHA256: $($hash.Hash)"
