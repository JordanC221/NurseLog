$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Missing prerequisite: Node.js 20 or newer." -ForegroundColor Red
    exit 1
}
npm install
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }
npm run db:migrate
npm run build
Write-Host "Setup complete. Run scripts/start.ps1 to start NurseLog."
