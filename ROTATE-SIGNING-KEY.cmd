@echo off
setlocal
cd /d "%~dp0"

echo This creates a NEW updater signing key.
echo Existing installations must be reinstalled manually once.
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\rotate-signing-key.ps1" -ProjectPath "D:\valueplus-system"

if errorlevel 1 (
  echo.
  echo Signing key setup failed. Read the error above.
  pause
  exit /b 1
)

echo.
echo New signing key configured successfully.
pause
