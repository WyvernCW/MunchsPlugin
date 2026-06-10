#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Generates a self-signed code signing certificate for Munch MSI.
.DESCRIPTION
  Creates a self-signed Authenticode certificate, exports it to .pfx
  for GitHub Actions signing, and optionally installs it to trusted root.
.PARAMETER OutputFile
  Path to export the .pfx file. Default: ./munch-signing-cert.pfx
.PARAMETER Password
  Password for the .pfx file. Default: auto-generated, printed at end.
.PARAMETER InstallToTrustedRoot
  If set, installs the cert to "Trusted Root Certification Authorities".
  Required for the MSI to be trusted on your own machine.
.PARAMETER CertStore
  Directory to store certificate files. Default: ./installer/windows/certs
#>

param(
  [string]$OutputFile,
  [string]$Password,
  [switch]$InstallToTrustedRoot,
  [string]$CertStore = "$PSScriptRoot\certs"
)

$ErrorActionPreference = "Stop"

# Generate password if not provided
if (-not $Password) {
  $Password = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
}

if (-not $OutputFile) {
  if (-not (Test-Path $CertStore)) {
    New-Item -ItemType Directory -Path $CertStore -Force | Out-Null
  }
  $OutputFile = "$CertStore\munch-signing.pfx"
}

Write-Host "=== Munch Code Signing Certificate Generator ==="
Write-Host ""
Write-Host "This script creates a self-signed Authenticode certificate for"
Write-Host "signing the Munch MSI installer. The certificate will:"
Write-Host "  - Be valid for 5 years"
Write-Host "  - Use SHA256 (recommended by Microsoft)"
Write-Host "  - Be exportable to .pfx for CI/CD use"
Write-Host ""

# Generate certificate
$notBefore = (Get-Date).AddDays(-1)
$notAfter = $notBefore.AddYears(5)
$subject = "CN=Munch Installer, O=WyvernCW, L=Internet, C=US"

Write-Host "Creating certificate with subject: $subject"
Write-Host "Valid: $($notBefore.ToString('yyyy-MM-dd')) to $($notAfter.ToString('yyyy-MM-dd'))"
Write-Host ""

$cert = New-SelfSignedCertificate `
  -Subject $subject `
  -Type CodeSigning `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -NotBefore $notBefore `
  -NotAfter $notAfter `
  -KeyUsage DigitalSignature `
  -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3") `
  -FriendlyName "Munch Installer Signing Cert"

$thumbprint = $cert.Thumbprint
Write-Host "Certificate created."
Write-Host "Thumbprint: $thumbprint"
Write-Host ""

# Export to PFX
$securePassword = ConvertTo-SecureString -String $Password -Force -AsPlainText
Export-PfxCertificate -Cert "Cert:\CurrentUser\My\$thumbprint" -FilePath $OutputFile -Password $securePassword

Write-Host "PFX exported to: $OutputFile"

# Export as base64 for GitHub Actions secrets
$pfxB64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($OutputFile))
$b64File = "$OutputFile.b64"
Set-Content -Path $b64File -Value $pfxB64
Write-Host "Base64 version saved to: $b64File"
Write-Host ""
Write-Host "For GitHub Actions, add these secrets:"
Write-Host "  MSI_SIGNING_CERT         = contents of $b64File"
Write-Host "  MSI_SIGNING_PASSWORD     = $Password"
Write-Host ""

# Optionally install to Trusted Root
if ($InstallToTrustedRoot) {
  Write-Host "Installing to Trusted Root Certification Authorities..."
  
  # Export cert without private key for root store
  $cerFile = "$CertStore\munch-root.cer"
  Export-Certificate -Cert "Cert:\CurrentUser\My\$thumbprint" -FilePath $cerFile -Type CERT | Out-Null
  
  # Import to Trusted Root store
  Import-Certificate -FilePath $cerFile -CertStoreLocation "Cert:\CurrentUser\Root" | Out-Null
  
  Write-Host "Certificate trusted. The MSI will not show 'unknown publisher' on this machine."
  Write-Host ""
}

Write-Host "=== Done ==="
Write-Host "Keep the .pfx file and password secure."
Write-Host "Anyone with access to the .pfx can sign code as 'Munch Installer'."
