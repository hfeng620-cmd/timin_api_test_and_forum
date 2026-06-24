param(
  [int]$Port = 3001
)

$ErrorActionPreference = "Stop"

$Project = Split-Path -Parent $PSScriptRoot
$Runtime = Join-Path $env:LOCALAPPDATA "TiminObserve"
$LogDir = Join-Path $Runtime "logs"
$UrlFile = Join-Path $Runtime "latest-url.txt"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force $LogDir | Out-Null

function Start-LoggedProcess {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string]$Command
  )

  $Log = Join-Path $LogDir "$Name-$Stamp.log"
  $Process = Start-Process powershell.exe -WindowStyle Minimized -PassThru -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    "Set-Location -LiteralPath '$WorkingDirectory'; $Command *> '$Log'"
  )

  return @{ Process = $Process; Log = $Log }
}

function Write-LatestStatus {
  param([string]$Message)
  $Message | Set-Content -Path $UrlFile -Encoding utf8
}

$Node = Get-Command node -ErrorAction SilentlyContinue
$Npm = Get-Command npm -ErrorAction SilentlyContinue
if (-not $Node -or -not $Npm) {
  Write-LatestStatus "node or npm not found. Install Node.js first."
  throw "node or npm not found"
}

$Cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $Cloudflared) {
  $Cloudflared = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter cloudflared.exe -ErrorAction SilentlyContinue | Select-Object -First 1
}
if (-not $Cloudflared) {
  Write-LatestStatus "cloudflared not found. Install it with: winget install --id Cloudflare.cloudflared"
  throw "cloudflared not found"
}
if ($Cloudflared.PSObject.Properties.Name -contains "Source" -and $Cloudflared.Source) {
  $CloudflaredPath = $Cloudflared.Source
} else {
  $CloudflaredPath = $Cloudflared.FullName
}

$Next = Start-LoggedProcess "next" $Project "npm run dev -- -H 0.0.0.0 -p $Port"

$Ready = $false
for ($i = 0; $i -lt 60; $i++) {
  if (Test-NetConnection 127.0.0.1 -Port $Port -InformationLevel Quiet) {
    $Ready = $true
    break
  }
  Start-Sleep 1
}

if (-not $Ready) {
  Write-LatestStatus "Next dev server did not open port $Port within 60 seconds. Check $($Next.Log)."
  throw "Next dev server did not start"
}

$Tunnel = Start-LoggedProcess "cloudflared" $Project "& '$CloudflaredPath' tunnel --url http://localhost:$Port"

$PublicUrl = $null
for ($i = 0; $i -lt 60; $i++) {
  if (Test-Path -LiteralPath $Tunnel.Log) {
    $LogText = Get-Content -Raw -LiteralPath $Tunnel.Log -ErrorAction SilentlyContinue
    if (-not $LogText) {
      Start-Sleep 1
      continue
    }
    $Match = [regex]::Match($LogText, "https://[-a-zA-Z0-9]+\.trycloudflare\.com")
    if ($Match.Success) {
      $PublicUrl = $Match.Value
      break
    }
  }
  Start-Sleep 1
}

if ($PublicUrl) {
  Write-LatestStatus "本机地址: http://127.0.0.1:$Port/`n公网临时入口: $PublicUrl`n生成时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n注意: Quick Tunnel 重启或重连后地址可能变化。"
  Write-Host "本机地址: http://127.0.0.1:$Port/"
  Write-Host "公网临时入口: $PublicUrl"
} else {
  Write-LatestStatus "Cloudflare quick tunnel is starting, but the public URL was not found within 60 seconds. Check $($Tunnel.Log)."
  Write-Host "本机地址: http://127.0.0.1:$Port/"
  Write-Host "Cloudflare 地址会写在日志: $($Tunnel.Log)"
}