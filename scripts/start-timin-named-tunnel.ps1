param(
  [int]$Port = 3001,
  [string]$TunnelName = "timin-observe",
  [string]$Hostname = "",
  [string]$ConfigPath = (Join-Path $env:USERPROFILE ".cloudflared\config.yml")
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

function ConvertTo-SingleQuotedArgument {
  param([string]$Value)
  return "'" + ($Value -replace "'", "''") + "'"
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

if (-not $TunnelName.Trim()) {
  Write-LatestStatus "TunnelName is required for Cloudflare named tunnel."
  throw "TunnelName is required"
}
if (-not $Hostname.Trim()) {
  Write-LatestStatus "Hostname is required so the fixed Cloudflare URL can be written to $UrlFile."
  throw "Hostname is required"
}
$HostnameValue = $Hostname.Trim() -replace "^https?://", ""
$HostnameValue = $HostnameValue.TrimEnd("/")
if ($ConfigPath -and -not (Test-Path -LiteralPath $ConfigPath)) {
  Write-LatestStatus "cloudflared config not found: $ConfigPath"
  throw "cloudflared config not found"
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

$CloudflaredCommand = "& $(ConvertTo-SingleQuotedArgument $CloudflaredPath) tunnel"
if ($ConfigPath) {
  $CloudflaredCommand += " --config $(ConvertTo-SingleQuotedArgument $ConfigPath)"
}
$CloudflaredCommand += " run $(ConvertTo-SingleQuotedArgument $TunnelName)"

$Tunnel = Start-LoggedProcess "cloudflared-named" $Project $CloudflaredCommand
Start-Sleep 3

if ($Tunnel.Process.HasExited) {
  Write-LatestStatus "Cloudflare named tunnel exited early. Check $($Tunnel.Log)."
  throw "Cloudflare named tunnel exited early"
}

$FixedUrl = "https://$HostnameValue/"
Write-LatestStatus "本机地址: http://127.0.0.1:$Port/`n公网固定入口: $FixedUrl`nTunnel: $TunnelName`nConfig: $ConfigPath`n生成时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n注意: 固定入口依赖本机 Next 和 cloudflared named tunnel 进程持续在线。"

Write-Host "本机地址: http://127.0.0.1:$Port/"
Write-Host "公网固定入口: $FixedUrl"
Write-Host "cloudflared 日志: $($Tunnel.Log)"

