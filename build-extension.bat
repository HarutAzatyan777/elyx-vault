@echo off
title Elyx Vault Extension Packer
echo ==============================================
echo       Elyx Vault Extension Auto-Packer        
echo ==============================================
echo.

set "SOURCE_DIR=%~dp0extension"
set "OUTPUT_ZIP=%~dp0elyx-vault-extension.zip"

if not exist "%SOURCE_DIR%" (
    echo [ERROR] Extension directory not found at %SOURCE_DIR%
    pause
    exit /b 1
)

if exist "%OUTPUT_ZIP%" del /f /q "%OUTPUT_ZIP%"

echo Creating %OUTPUT_ZIP% from extension directory...
powershell -Command "Compress-Archive -Path '%SOURCE_DIR%\*' -DestinationPath '%OUTPUT_ZIP%' -Force"

if exist "%OUTPUT_ZIP%" (
    echo.
    echo [SUCCESS] Extension zipped successfully to:
    echo %OUTPUT_ZIP%
) else (
    echo.
    echo [ERROR] Failed to create zip archive.
)

echo.
pause
