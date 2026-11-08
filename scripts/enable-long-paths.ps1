#Requires -RunAsAdministrator
$ErrorActionPreference = "Stop"

$path = "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem"
New-ItemProperty -Path $path -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force | Out-Null

Write-Host "Win32 long paths enabled. Restart your computer, then rebuild with: npm run android"
Write-Host "Current value:" (Get-ItemProperty $path).LongPathsEnabled
