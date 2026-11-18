$ErrorActionPreference = "Stop"
$appRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $appRoot

if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
    throw "Node.js 20 or newer is required. Install the current LTS release from https://nodejs.org/ and reopen this launcher."
}
if (-not (Test-Path (Join-Path $appRoot "node_modules"))) {
    throw "Dependencies are missing. Run setup.ps1 once before using this launcher."
}

$env:NODE_ENV = "development"
$env:PORT = "3001"
$env:DATA_DIR = Join-Path $appRoot "data\review-demo"
$env:STORAGE_DIR = Join-Path $appRoot "app-storage-review"
$null = New-Item -ItemType Directory -Force -Path $env:DATA_DIR, $env:STORAGE_DIR

$node = (Get-Command node.exe).Source
$api = $null
$web = $null

function Stop-ReviewProcess($process) {
    if ($null -ne $process -and -not $process.HasExited) {
        & taskkill.exe /PID $process.Id /T /F | Out-Null
    }
}

try {
    $api = Start-Process -FilePath $node -ArgumentList "server/index.js" -WorkingDirectory $appRoot -PassThru -NoNewWindow
    $viteEntry = Join-Path $appRoot "node_modules\vite\bin\vite.js"
    $web = Start-Process -FilePath $node -ArgumentList "`"$viteEntry`" --host 127.0.0.1 --port 5173" -WorkingDirectory $appRoot -PassThru -NoNewWindow

    $deadline = (Get-Date).AddSeconds(60)
    $apiReady = $false
    $webReady = $false
    while ((Get-Date) -lt $deadline -and (-not $apiReady -or -not $webReady)) {
        if ($api.HasExited) { throw "The NurseLog API stopped during startup." }
        if ($web.HasExited) { throw "The NurseLog web server stopped during startup." }
        try {
            $null = Invoke-WebRequest "http://127.0.0.1:3001/api/health" -UseBasicParsing -TimeoutSec 2
            $apiReady = $true
        } catch { }
        try {
            $null = Invoke-WebRequest "http://127.0.0.1:5173/" -UseBasicParsing -TimeoutSec 2
            $webReady = $true
        } catch { }
        if (-not $apiReady -or -not $webReady) { Start-Sleep -Milliseconds 500 }
    }
    if (-not $apiReady -or -not $webReady) { throw "NurseLog did not become ready within 60 seconds." }

    $url = "http://127.0.0.1:5173"
    Write-Host "NurseLog is ready at $url" -ForegroundColor Green
    Write-Host "Review data is isolated in data\review-demo and app-storage-review."
    Write-Host "Use fictional information only. Close this window to stop both services."
    Start-Process $url

    while ($true) {
        Start-Sleep -Seconds 2
        if ($api.HasExited) { throw "The NurseLog API stopped. Close the launcher and check for errors." }
        if ($web.HasExited) { throw "The NurseLog web server stopped. Close the launcher and check for errors." }
    }
} finally {
    Stop-ReviewProcess $web
    Stop-ReviewProcess $api
}
