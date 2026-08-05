@echo off
setlocal EnableExtensions
REM ============================================
REM  ControlAR Energia - Inicio rapido (Windows)
REM  Doble clic o ejecutar desde cmd.
REM  Pide permisos de administrador SOLO si hay
REM  que instalar Node.js o PostgreSQL (winget).
REM  Si ya estan instalados, corre sin admin.
REM  Luego ejecuta el setup completo (start.ps1).
REM  Uso:  start.bat [-Reset]
REM ============================================

REM ---- Detectar si falta instalar algo (Node.js o PostgreSQL) ----
powershell -NoProfile -Command "try { $n = [bool](Get-Command node -ErrorAction SilentlyContinue); $npm = [bool](Get-Command npm -ErrorAction SilentlyContinue); $p = [bool](Get-Command psql -ErrorAction SilentlyContinue); if (-not $p) { $p = [bool](Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\psql.exe' -ErrorAction SilentlyContinue | Select-Object -First 1) }; if ($n -and $npm -and $p) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1

if errorlevel 1 (
    echo Se necesita instalar Node.js y/o PostgreSQL.
    echo Solicitando permisos de administrador...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs -ArgumentList '%*'"
    exit /b
)

cd /d "%~dp0"

echo =============================================
echo  ControlAR Energia - Inicio rapido (Windows)
echo =============================================
echo.

if not exist "%~dp0start.ps1" (
    echo ERROR: no se encontro start.ps1 junto a start.bat.
    echo Descarga de nuevo la carpeta del proyecto.
    echo.
    pause
    exit /b 1
)

echo >>> Ejecutando el setup de Windows...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*

echo.
pause
exit /b
