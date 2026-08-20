# ============================================
#  ControlAR Energia - Setup automatico (Windows)
#  Detecta la IP de la red, configura CORS,
#  instala dependencias y levanta
#  backend + frontend automaticamente.
#  Funciona desde cualquier PC/Notebook de la red.
# ============================================

$ErrorActionPreference = "Stop"
$BACKEND_PORT  = 3001
$FRONTEND_PORT = 3000

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  ControlAR Energia - Setup automatico"       -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# ---------- Helpers ----------
function Die($msg) {
    Write-Host ""
    Write-Host "ERROR: $msg" -ForegroundColor Red
    Write-Host "Presiona una tecla para cerrar..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# ---------- 1. Detectar IP de la red ----------
Write-Host ">>> Detectando IP de la red..."

# Intento 1: Interfaz activa con gateway (Wi-Fi o Ethernet real)
$NETWORK_IP = (
    Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
        $_.IPAddress -ne "127.0.0.1" -and
        $_.IPAddress -notlike "169.254.*" -and
        $_.PrefixOrigin -ne "WellKnown"
    } |
    Sort-Object { [int]($_.InterfaceAlias -replace '[^0-9]', '') } |
    Select-Object -First 1 -ExpandProperty IPAddress
)

# Intento 2: Cualquier IPv4 no-loopback
if (-not $NETWORK_IP) {
    $NETWORK_IP = (
        Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.IPAddress -notlike "169.254.*" } |
        Select-Object -First 1 -ExpandProperty IPAddress
    )
}

# Intento 3: ipconfig como fallback
if (-not $NETWORK_IP) {
    $ipConfig = ipconfig 2>$null
    $match = $ipConfig | Select-String -Pattern "IPv4.*?:\s+([\d.]+)"
    if ($match) {
        $NETWORK_IP = ($match.Matches[0].Groups[1].Value).Trim()
    }
}

if (-not $NETWORK_IP) { $NETWORK_IP = "localhost" }
Write-Host ">>> IP de red detectada: $NETWORK_IP" -ForegroundColor Green

# ---------- 2. Verificar Node.js ----------
$nodeOk = [bool](Get-Command node -ErrorAction SilentlyContinue)
$npmOk  = [bool](Get-Command npm  -ErrorAction SilentlyContinue)

if (-not $nodeOk -or -not $npmOk) {
    Die "Node.js o npm no estan instalados. Instalalos desde https://nodejs.org y volve a ejecutar."
}

$nodeVer = & node -v
$npmVer  = & npm -v
Write-Host ">>> Versiones: Node $nodeVer | npm $npmVer"

# ---------- 3. Verificar PostgreSQL (solo para DB local) ----------
$psqlPath = $null
$psqls = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\psql.exe' -ErrorAction SilentlyContinue
if ($psqls) { $psqlPath = $psqls | Select-Object -First 1 -ExpandProperty FullName }

# ---------- 4. Backend ----------
$backendDir = Join-Path $PSScriptRoot "backend"
Set-Location $backendDir

# Crear .env si no existe
if (-not (Test-Path ".env")) {
    Write-Host ">>> Creando backend/.env..."
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    $hex = ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""
    $JWT_SECRET = "controlar_$hex"

    $envContent = @"
NODE_ENV=development
PORT=$BACKEND_PORT
DB_HOST=localhost
DB_PORT=5432
DB_NAME=controlar_energia
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:$FRONTEND_PORT
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.6-flash
"@
    Set-Content -Path ".env" -Value $envContent
    Write-Host ">>> .env creado."
}

# Actualizar CORS_ORIGIN con la IP de la red
$envFile = Get-Content ".env" -Raw
$CORS_VALUE = "http://localhost:$FRONTEND_PORT,http://${NETWORK_IP}:${FRONTEND_PORT},http://${NETWORK_IP}:${BACKEND_PORT}"

if ($envFile -match "^CORS_ORIGIN=.*" ) {
    $envFile = $envFile -replace "^CORS_ORIGIN=.*", "CORS_ORIGIN=$CORS_VALUE"
} else {
    $envFile += "`r`nCORS_ORIGIN=$CORS_VALUE"
}
Set-Content -Path ".env" -Value $envFile -NoNewline
Write-Host ">>> CORS configurado para: $CORS_VALUE"

# Configurar PostgreSQL local si usa DB local
if ($envFile -match "DB_HOST=localhost" -and $envFile -notmatch "supabase") {
    if ($psqlPath) {
        $pgBin = Split-Path $psqlPath
        $pgHba = & $psqlPath -U postgres -t -A -c "SHOW hba_file;" 2>$null
        if ($pgHba) {
            $pgHba = $pgHba.Trim()
            if (Test-Path $pgHba) {
                $content = Get-Content $pgHba -Raw
                if ($content -match "host\s+all\s+all\s+127.0.0.1/32\s+peer") {
                    Write-Host ">>> Configurando pg_hba.conf..."
                    Copy-Item $pgHba "$pgHba.bak" -Force
                    $content = $content -replace "(host\s+all\s+all\s+127.0.0.1/32\s+)peer", "`$1scram-sha-256"
                    $content = $content -replace "(host\s+all\s+all\s+::1/128\s+)peer", "`$1scram-sha-256"
                    Set-Content $pgHba -Value $content -NoNewline
                    & "$pgBin\pg_ctl.exe" restart -D "$pgBin\..\data" 2>$null
                    Start-Sleep -Seconds 2
                }
            }
        }
    }
}

Write-Host ">>> Instalando dependencias del backend..."
& npm install
if ($LASTEXITCODE -ne 0) { Die "Fallo 'npm install' en el backend." }

# Primera ejecucion: crear tablas
if (-not (Test-Path ".db-initialized")) {
    Write-Host ">>> Primera ejecucion: creando tablas y cargando datos iniciales..."
    & npm run db:reset
    if ($LASTEXITCODE -ne 0) { Die "Fallo 'npm run db:reset'." }
    Set-Content ".db-initialized" "done"
    Write-Host ">>> Base de datos inicializada."
} else {
    Write-Host ">>> Base de datos ya inicializada."
}

Write-Host ">>> Iniciando backend en el puerto $BACKEND_PORT (0.0.0.0)..."
$backendProc = Start-Process -FilePath "node" -ArgumentList "src/server.js" -WorkingDirectory $backendDir -PassThru -NoNewWindow
Write-Host ">>> Backend PID: $($backendProc.Id)"

# Esperar backend
Write-Host ">>> Esperando backend..."
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$BACKEND_PORT/api/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch {}
}
if ($ready) { Write-Host ">>> Backend listo." -ForegroundColor Green }
else { Write-Host ">>> Backend tardo, pero continuando..." -ForegroundColor Yellow }

# ---------- 5. Frontend ----------
$frontendDir = Join-Path $PSScriptRoot "frontend"
Set-Location $frontendDir

# Crear .env del frontend con la URL del backend
$frontendEnv = "DISABLE_ESLINT_PLUGIN=true`r`n"
$frontendEnv += "REACT_APP_BACKEND_URL=http://${NETWORK_IP}:${BACKEND_PORT}`r`n"
Set-Content -Path ".env" -Value $frontendEnv -NoNewline
Write-Host ">>> Frontend .env configurado (backend: http://${NETWORK_IP}:${BACKEND_PORT})"

Write-Host ">>> Instalando dependencias del frontend..."
& npm install
if ($LASTEXITCODE -ne 0) { Die "Fallo 'npm install' en el frontend." }

Write-Host ">>> Iniciando frontend en el puerto $FRONTEND_PORT..."
$env:BROWSER = "none"
$frontendProc = Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory $frontendDir -PassThru -NoNewWindow
Write-Host ">>> Frontend PID: $($frontendProc.Id)"

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  ControlAR Energia esta corriendo!"           -ForegroundColor Green
Write-Host ""
Write-Host "  Desde esta maquina:"
Write-Host "    Frontend: http://localhost:$FRONTEND_PORT"
Write-Host "    Backend:  http://localhost:$BACKEND_PORT"
Write-Host ""
Write-Host "  Desde otros dispositivos en la red:"
Write-Host "    Frontend: http://${NETWORK_IP}:${FRONTEND_PORT}" -ForegroundColor Yellow
Write-Host "    Backend:  http://${NETWORK_IP}:${BACKEND_PORT}"  -ForegroundColor Yellow
Write-Host ""
Write-Host "  API Health: http://${NETWORK_IP}:${BACKEND_PORT}/api/health" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Usuario demo: demo@controlar.com"
Write-Host "  Contrasena:   123456"
Write-Host ""
Write-Host "  Presiona Ctrl+C para detener todo."
Write-Host "=============================================" -ForegroundColor Cyan

# Mantener abierto
try {
    $backendProc.WaitForExit()
} finally {
    Write-Host "Deteniendo servidores..."
    if (-not $backendProc.HasExited)  { Stop-Process -Id $backendProc.Id  -Force -ErrorAction SilentlyContinue }
    if (-not $frontendProc.HasExited) { Stop-Process -Id $frontendProc.Id -Force -ErrorAction SilentlyContinue }
    Write-Host "Servidores detenidos."
}
