@echo off
setlocal EnableExtensions
REM ============================================
REM  ControlAR Energia - Inicio rapido (Windows)
REM  Doble clic o ejecutar desde cmd.
REM  Detecta la IP de la red automaticamente
REM  y levanta backend + frontend.
REM  Uso:  start.bat
REM ============================================

cd /d "%~dp0"

echo =============================================
echo  ControlAR Energia - Inicio rapido (Windows)
echo =============================================
echo.

REM Verificar que Node.js y npm existan
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js no esta instalado.
    echo Descargalo desde https://nodejs.org
    echo.
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm no esta disponible.
    echo Reinstala Node.js desde https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo >>> Ejecutando setup automatico...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"

echo.
pause
exit /b
