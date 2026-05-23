@echo off
setlocal
rem === Cho Dengon Battle launcher (ASCII only, codepage-safe) ===
rem Double-click to start a local server and open the game in your browser.
rem To stop: close the "dengon-server" window that opens.

cd /d "%~dp0"
set "PORT=8123"

rem --- find a usable Python: py launcher -> python -> default install path ---
set "PYEXE="
where py >nul 2>nul && set "PYEXE=py"
if not defined PYEXE ( where python >nul 2>nul && set "PYEXE=python" )
if not defined PYEXE if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" set "PYEXE=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"

if not defined PYEXE (
  echo [ERROR] Python not found.
  echo Install Python, or set PYEXE in this file to your python.exe path.
  pause
  exit /b
)

rem --- start the server in its own window (close that window to stop) ---
start "dengon-server" "%PYEXE%" -m http.server %PORT%

rem --- wait for the server, then open the browser (index.html at the root) ---
timeout /t 3 >nul
start "" "http://localhost:%PORT%/"

exit /b
