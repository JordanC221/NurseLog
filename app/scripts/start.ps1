$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "Checking NurseLog prerequisites..."
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js 20 or newer is required. Install it from https://nodejs.org/ and reopen PowerShell." -ForegroundColor Red
    exit 1
}

$nodeVersion = & node --version
Write-Host "Node.js $nodeVersion"
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..."
    npm install
}
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from placeholders."
}
npm run db:migrate
Write-Host "Starting NurseLog..."
npm run dev
