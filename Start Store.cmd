@echo off
rem Double-click this file to start the store on Windows.
rem
rem Uses your Node.js if it is version 20 or newer. Otherwise it downloads the
rem official Node.js from nodejs.org into the .runtime folder (one time only;
rem nothing is installed on your system).
setlocal
title Store
cd /d "%~dp0"

set "NODE_VERSION=24.22.3"
set "NODE_EXE="
set "NODE_MAJOR=0"

where node >nul 2>nul
if not errorlevel 1 (
  for /f "tokens=1 delims=v." %%v in ('node -v') do set "NODE_MAJOR=%%v"
)
if %NODE_MAJOR% GEQ 20 set "NODE_EXE=node"
if defined STORE_PORTABLE_NODE set "NODE_EXE="

if not defined NODE_EXE call :portable_node
if not defined NODE_EXE goto failed

"%NODE_EXE%" app\start.mjs
if errorlevel 1 goto failed
goto end

:portable_node
set "ARCH=x64"
if /i "%PROCESSOR_ARCHITECTURE%"=="ARM64" set "ARCH=arm64"
set "NODE_NAME=node-v%NODE_VERSION%-win-%ARCH%"
if exist ".runtime\%NODE_NAME%\node.exe" goto portable_ready

where curl.exe >nul 2>nul
if errorlevel 1 goto no_download
where tar.exe >nul 2>nul
if errorlevel 1 goto no_download

echo Downloading Node.js %NODE_VERSION% from nodejs.org (one time, about 30 MB)...
if not exist ".runtime" mkdir ".runtime"
curl.exe -fL --progress-bar -o ".runtime\%NODE_NAME%.zip" "https://nodejs.org/dist/v%NODE_VERSION%/%NODE_NAME%.zip"
if errorlevel 1 goto download_failed
tar.exe -xf ".runtime\%NODE_NAME%.zip" -C ".runtime"
if errorlevel 1 goto download_failed
del ".runtime\%NODE_NAME%.zip"

:portable_ready
set "NODE_EXE=%~dp0.runtime\%NODE_NAME%\node.exe"
exit /b 0

:download_failed
echo.
echo Could not download Node.js. Check your internet connection and try again.
exit /b 1

:no_download
echo.
echo This version of Windows can't download Node.js automatically.
echo Install the LTS version from https://nodejs.org, then run this file again.
start "" "https://nodejs.org"
exit /b 1

:failed
echo.
echo The store could not start. See the messages above.

:end
pause
