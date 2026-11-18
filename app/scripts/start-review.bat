@echo off
setlocal
cd /d "%~dp0.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-review.ps1"
if errorlevel 1 (
  echo.
  echo NurseLog review could not start. See the message above.
  pause
)
