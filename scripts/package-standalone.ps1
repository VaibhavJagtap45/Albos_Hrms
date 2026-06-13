$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$NextDir = Join-Path $ProjectRoot ".next"
$StandaloneDir = Join-Path $NextDir "standalone"
$StandaloneNextDir = Join-Path $StandaloneDir ".next"
$StaticSource = Join-Path $NextDir "static"
$StaticTarget = Join-Path $StandaloneNextDir "static"
$PublicSource = Join-Path $ProjectRoot "public"
$PublicTarget = Join-Path $StandaloneDir "public"
$ZipPath = Join-Path $NextDir "build.zip"

Set-Location $ProjectRoot

if (-not (Test-Path $StandaloneDir)) {
  throw "Missing .next\standalone. Run npm run build before packaging."
}

if (-not (Test-Path $StaticSource)) {
  throw "Missing .next\static. Run npm run build before packaging."
}

New-Item -ItemType Directory -Force -Path $StandaloneNextDir | Out-Null

if (Test-Path $StaticTarget) {
  Remove-Item -LiteralPath $StaticTarget -Recurse -Force
}
Copy-Item -LiteralPath $StaticSource -Destination $StaticTarget -Recurse -Force

if (Test-Path $PublicSource) {
  if (Test-Path $PublicTarget) {
    Remove-Item -LiteralPath $PublicTarget -Recurse -Force
  }
  Copy-Item -LiteralPath $PublicSource -Destination $PublicTarget -Recurse -Force
}

if (Test-Path $ZipPath) {
  Remove-Item -LiteralPath $ZipPath -Force
}

Compress-Archive -Path (Join-Path $StandaloneDir "*") -DestinationPath $ZipPath -Force

Write-Output "Created $ZipPath"
