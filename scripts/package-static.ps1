$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$OutDir = Join-Path $ProjectRoot "out"
$ZipPath = Join-Path $ProjectRoot "build.zip"

Set-Location $ProjectRoot

if (-not (Test-Path $OutDir)) {
  throw "Missing 'out' folder. Run 'npm run build' first (output: 'export' generates it)."
}

if (Test-Path $ZipPath) {
  Remove-Item -LiteralPath $ZipPath -Force
}

# Zip the CONTENTS of out/ (not the out folder itself) so the files land directly
# in public_html when extracted.
Compress-Archive -Path (Join-Path $OutDir "*") -DestinationPath $ZipPath -Force

Write-Output "Created $ZipPath"
