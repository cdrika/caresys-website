$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$runtime=Join-Path $root 'var'
New-Item -ItemType Directory -Force -Path $runtime | Out-Null
$node=if(Get-Command node -ErrorAction SilentlyContinue){(Get-Command node).Source}else{'C:/Users/s163163/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'}
if(!(Test-Path -LiteralPath $node)){throw 'Install Node.js 20 or later.'}
$listener=Get-NetTCPConnection -LocalPort 8090 -State Listen -ErrorAction SilentlyContinue
if($listener){throw 'Port 8090 is already in use. Inspect the existing listener before starting another server.'}
$process=Start-Process -FilePath $node -ArgumentList @('"' + (Join-Path $root 'server.mjs') + '"') -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtime 'server.log') -RedirectStandardError (Join-Path $runtime 'server-error.log') -PassThru
Set-Content -LiteralPath (Join-Path $runtime 'website.pid') -Value $process.Id
Write-Output 'CareSys information website: http://localhost:8090'
