@echo off
setlocal
cd /d "%~dp0"

set /p VERSION=Enter update version (example 1.0.3): 

if "%VERSION%"=="" (
  echo Version is required.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\publish-update.ps1" -Version "%VERSION%" -ProjectPath "D:\valueplus-system"

if errorlevel 1 (
  echo.
  echo Publish failed. Read the error above. Nothing was force-pushed.
  pause
  exit /b 1
)

echo.
echo Update release was queued successfully.
pause
