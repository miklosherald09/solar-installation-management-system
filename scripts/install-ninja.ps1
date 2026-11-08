$ErrorActionPreference = "Stop"

$toolsDir = Join-Path $PSScriptRoot "..\tools\ninja"
$ninjaExe = Join-Path $toolsDir "ninja.exe"

if (Test-Path $ninjaExe) {
  Write-Host "ninja.exe already present at $ninjaExe"
  exit 0
}

New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null

$releaseUrl = "https://github.com/ninja-build/ninja/releases/download/v1.12.1/ninja-win.zip"
$zipPath = Join-Path $env:TEMP "ninja-win.zip"

Write-Host "Downloading Ninja 1.12.1 (Windows long-path support)..."
Invoke-WebRequest -Uri $releaseUrl -OutFile $zipPath
Expand-Archive -Path $zipPath -DestinationPath $toolsDir -Force
Remove-Item $zipPath -Force

Write-Host "Installed $ninjaExe"
