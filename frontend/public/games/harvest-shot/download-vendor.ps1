# Download Three.js 0.160.0 into vendor/ for offline play.
# Usage: right-click → Run with PowerShell, or:
#   powershell -ExecutionPolicy Bypass -File .\download-vendor.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$vendor = Join-Path $root "vendor"
New-Item -ItemType Directory -Force -Path $vendor | Out-Null
$url = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"
$out = Join-Path $vendor "three.min.js"
Write-Host "Downloading $url ..."
Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
Set-Content -Path (Join-Path $vendor "VERSION.txt") -Value "three@0.160.0"
$len = (Get-Item $out).Length
Write-Host "OK: vendor/three.min.js ($len bytes)"
