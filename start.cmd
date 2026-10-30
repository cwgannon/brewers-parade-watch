@echo off
rem Double-click this to run Brewers Parade Watch on this computer.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Get it from https://nodejs.org and run this again.
  pause
  exit /b 1
)
echo Starting Brewers Parade Watch... close this window to stop it.
node serve.js
pause
