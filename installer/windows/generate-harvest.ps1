param(
  [string]$SourceDir,
  [string]$OutputFile
)
$ErrorActionPreference = "Stop"
$excludeDirs = @('node_modules', '.git', '.vercel', 'coverage', 'dist', 'certs', '.store', 'opencode-plugin', 'installer')
$excludeFiles = @('*.wixpdb', '*.msi', '*.sha256', '*.tgz')

$files = Get-ChildItem -Path $SourceDir -Recurse -File | Where-Object {
  $dir = $_.DirectoryName
  foreach ($ex in $excludeDirs) {
    if ($dir -like "*\$ex\*" -or $dir -like "*\$ex") { return $false }
  }
  foreach ($pat in $excludeFiles) {
    if ($_.Name -like $pat) { return $false }
  }
  return $true
}

$relativePaths = $files | ForEach-Object {
  $_.FullName.Substring($SourceDir.Length + 1)
} | Sort-Object

function GuidFromPath($path) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($path.ToLower())
  $hash = [System.Security.Cryptography.SHA256]::HashData($bytes)
  $s = [System.BitConverter]::ToString($hash, 0, 16) -replace '-', ''
  $s = $s.Substring(0, 8) + '-' + $s.Substring(8, 4) + '-' + $s.Substring(12, 4) + '-' + $s.Substring(16, 4) + '-' + $s.Substring(20, 12)
  $v = [int]("0x" + $s.Substring(14, 2))
  $v = ($v -band 0x0f) -bor 0x40
  $s = $s.Substring(0, 14) + $v.ToString("x2") + $s.Substring(16)
  $v = [int]("0x" + $s.Substring(19, 2))
  $v = ($v -band 0x3f) -bor 0x80
  $s = $s.Substring(0, 19) + $v.ToString("x2") + $s.Substring(21)
  $s.ToUpper()
}

# Collect unique directories (including nested)
$dirSet = New-Object 'System.Collections.Generic.HashSet[string]'
$relativePaths | ForEach-Object {
  $dir = Split-Path $_ -Parent
  while ($dir -and $dirSet.Add($dir)) {
    $dir = Split-Path $dir -Parent
  }
}

# Build directory tree: parent -> list of children
$dirChildren = @{ '' = @() }
$dirNames = @{ '' = 'INSTALLDIR' }
$dirIds = @{ '' = 'INSTALLDIR' }
$dirCounter = 0
$sortedDirs = $dirSet | Sort-Object
foreach ($dir in $sortedDirs) {
  if ($dir -eq '') { continue }
  $dirCounter++
  $id = "dir_$dirCounter"
  $dirIds[$dir] = $id
  $dirNames[$dir] = Split-Path $dir -Leaf
  $parent = Split-Path $dir -Parent
  if (-not $dirChildren.ContainsKey($parent)) { $dirChildren[$parent] = @() }
  $dirChildren[$parent] += $dir
}

# Build directory XML recursively
function WriteDir($parentRel, $indent) {
  $sb = [System.Text.StringBuilder]::new()
  $children = $dirChildren[$parentRel] | Sort-Object
  foreach ($childRel in $children) {
    $id = $dirIds[$childRel]
    $name = $dirNames[$childRel]
    $leaf = Split-Path $childRel -Leaf
    [void]$sb.AppendLine("$indent  <Directory Id=`"$id`" Name=`"$leaf`">")
    [void]$sb.AppendLine((WriteDir $childRel "$indent    "))
    [void]$sb.AppendLine("$indent  </Directory>")
  }
  return $sb.ToString()
}

# Build output
$componentId = 0
$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine('<?xml version="1.0" encoding="utf-8"?>')
[void]$sb.AppendLine('<Wix xmlns="http://wixtoolset.org/schemas/v4/wxs">')
[void]$sb.AppendLine('  <Fragment>')
[void]$sb.AppendLine('    <DirectoryRef Id="INSTALLDIR">')
[void]$sb.AppendLine((WriteDir '' '      ').TrimEnd())
[void]$sb.AppendLine('    </DirectoryRef>')

[void]$sb.AppendLine('    <DirectoryRef Id="INSTALLDIR">')
foreach ($rel in $relativePaths) {
  $componentId++
  $compName = "cmp_$componentId"
  $guid = GuidFromPath "munch_$rel"
  $dir = Split-Path $rel -Parent
  $dirId = if ($dir) { $dirIds[$dir] } else { 'INSTALLDIR' }
  [void]$sb.AppendLine("      <Component Id=`"$compName`" Directory=`"$dirId`" Bitness=`"always64`" Guid=`"$guid`">")
  [void]$sb.AppendLine("        <File Id=`"fil_$componentId`" Source=`"`$(var.SourceDir)$rel`" />")
  [void]$sb.AppendLine("      </Component>")
}
[void]$sb.AppendLine('    </DirectoryRef>')

[void]$sb.AppendLine('    <ComponentGroup Id="HarvestedFiles">')
for ($i = 1; $i -le $componentId; $i++) {
  [void]$sb.AppendLine("      <ComponentRef Id=`"cmp_$i`" />")
}
[void]$sb.AppendLine('    </ComponentGroup>')
[void]$sb.AppendLine('  </Fragment>')
[void]$sb.AppendLine('</Wix>')

Set-Content -Path $OutputFile -Value $sb.ToString() -Encoding UTF8
Write-Host "Generated $componentId file entries across $($sortedDirs.Count) directories -> $OutputFile"
