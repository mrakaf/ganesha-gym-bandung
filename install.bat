@echo off
echo ========================================
echo Installing Dependencies for Ganesha Gym v2
echo ========================================
echo.

cd /d %~dp0

REM Cek apakah npm ada di PATH
where npm >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Using npm from PATH...
    npm install
) else (
    echo npm not found in PATH, trying Laragon npm...
    if exist "C:\laragon\bin\nodejs\node-v22\npm.cmd" (
        C:\laragon\bin\nodejs\node-v22\npm.cmd install
    ) else (
        echo ERROR: npm not found!
        echo Please install Node.js or ensure Laragon is installed.
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo Installation Complete!
echo ========================================
pause

