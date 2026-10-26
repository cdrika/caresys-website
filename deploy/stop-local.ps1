$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$pidFile=Join-Path $root 'var/website.pid'
if(!(Test-Path -LiteralPath $pidFile)){throw 'No website PID file exists.'}
$websiteProcessId=[int](Get-Content -LiteralPath $pidFile)
$process=Get-CimInstance Win32_Process -Filter "ProcessId=$websiteProcessId"
if(!$process -or $process.Name -ne 'node.exe' -or !$process.CommandLine.Contains((Join-Path $root 'server.mjs'))){throw 'The recorded process is no longer the website server; nothing was stopped.'}
Stop-Process -Id $websiteProcessId
Write-Output 'Stopped the local website server.'
