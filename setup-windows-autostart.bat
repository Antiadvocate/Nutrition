@echo off
echo ===================================================
echo   Automated Windows Startup Setup for Nutrition App
echo ===================================================
echo.

set "APP_DIR=%~dp0"
:: Remove trailing backslash if present
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS_FILE=%STARTUP_FOLDER%\NutritionAppStart.vbs"

echo Creating background startup script at: 
echo %VBS_FILE%
echo.

(
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo WshShell.CurrentDirectory = "%APP_DIR%"
echo WshShell.Run "cmd /c if not exist node_modules (npm install) ^& npm run dev", 0, False
echo WScript.Sleep 4000
echo WshShell.Run "http://localhost:3000"
) > "%VBS_FILE%"

echo Setup complete! 
echo.
echo From now on, the server will start silently in the background every time 
echo you turn on your PC, and your browser will automatically open to the app.
echo.
echo Note: If you ever move this folder to a different location, just run this 
echo setup script again to update the path.
echo.
pause
