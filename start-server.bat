@echo off
echo Starting Nutrition App Server...
cd /d "%~dp0"

if not exist "node_modules\" (
    echo First time setup: Installing dependencies...
    call npm install
)

echo Opening browser...
start http://localhost:3000

echo Starting development server...
npm run dev
