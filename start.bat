@echo off
cd /d "%~dp0"
where node >nul 2>&1 || (
  echo Node.js が見つかりません。
  pause
  exit /b 1
)
node server.mjs
