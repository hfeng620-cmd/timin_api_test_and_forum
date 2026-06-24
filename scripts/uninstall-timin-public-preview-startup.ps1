param(
  [string]$TaskName = "TiminObserveDevTunnel"
)

$StartupCmd = Join-Path ([Environment]::GetFolderPath("Startup")) "TiminObserveDevTunnel.cmd"
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
schtasks.exe /Delete /TN $TaskName /F 2>$null | Out-Null
Remove-Item -LiteralPath $StartupCmd -Force -ErrorAction SilentlyContinue
Write-Host "已移除登录自启动入口: $TaskName"