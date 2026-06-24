param(
  [string]$TaskName = "TiminObserveDevTunnel"
)

$ErrorActionPreference = "Stop"

$Project = Split-Path -Parent $PSScriptRoot
$Script = Join-Path $PSScriptRoot "start-timin-public-preview.ps1"
$TaskCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$Script`""
$StartupDir = [Environment]::GetFolderPath("Startup")
$StartupCmd = Join-Path $StartupDir "TiminObserveDevTunnel.cmd"
$Installed = $false

try {
  $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$Script`"" -WorkingDirectory $Project
  $Trigger = New-ScheduledTaskTrigger -AtLogOn
  $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
  Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Force -ErrorAction Stop | Out-Null
  $Installed = $true
  Write-Host "已安装登录自启动计划任务: $TaskName"
} catch {
  schtasks.exe /Create /TN $TaskName /SC ONLOGON /TR $TaskCommand /F 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    $Installed = $true
    Write-Host "已通过 schtasks 安装登录自启动任务: $TaskName"
  }
}

if (-not $Installed) {
  New-Item -ItemType Directory -Force -Path $StartupDir | Out-Null
  "@echo off`r`npowershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$Script`"`r`n" | Set-Content -Path $StartupCmd -Encoding ascii
  Write-Host "计划任务权限不足，已改用启动文件夹: $StartupCmd"
}

Write-Host "手动启动: powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$Script`""