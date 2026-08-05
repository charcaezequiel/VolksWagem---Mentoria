#!/bin/bash
# ============================================
#  ControlAR Energía - Setup automático
#  Instala todas las dependencias y levanta
#  backend + frontend por sí solo.
#  Compatible con Ubuntu/Debian y WSL.
#  En Windows nativo usá  start.ps1
# ============================================

NODE_MAJOR=18
DB_NAME="controlar_energia"
DB_USER="postgres"
DB_PASSWORD="postgres"
BACKEND_PORT=3001
FRONTEND_PORT=3000

echo "============================================="
echo "  ControlAR Energía - Setup automático"
echo "============================================="

# ---------- Helpers ----------
command_exists() { command -v "$1" &> /dev/null; }

die() {
    echo ""
    echo "ERROR: $1" >&2
    echo "Presioná Enter para cerrar..."
    read -r _ || true
    exit 1
}

# Detectar entorno: si es Windows nativo (Git Bash/MSYS/Cygwin), el script
# no puede usar apt ni systemctl. Se sugiere usar start.ps1.
case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*)
        echo ""
        echo "Estás en Windows nativo. Este script (start.sh) necesita Linux o WSL."
        echo "Usá el script nativo de Windows:"
        echo "    start.bat                 (doble clic o desde cmd)"
        echo "    powershell -ExecutionPolicy Bypass -File .\\start.ps1"
        echo ""
        read -r -p "Presioná Enter para cerrar..." _
        exit 1
        ;;
    Linux)
        # WSL sin systemd (WSL1 o instalación predeterminada): usar service
        if [ -f /proc/version ] && grep -qi microsoft /proc/version; then
            echo ">>> Detectado WSL. Se usará 'service' en lugar de systemctl."
        fi
        ;;
    *) ;;
esac

cleanup() {
    echo ""
    echo "Deteniendo servidores..."
    [ -n "${BACKEND_PID:-}" ] && kill "$BACKEND_PID" 2>/dev/null || true
    [ -n "${FRONTEND_PID:-}" ] && kill "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

check_port() {
    if command_exists ss; then
        if ss -tln 2>/dev/null | grep -q ":$1 "; then
            echo "AVISO: el puerto $1 ya está en uso. Verificá que no haya otro proceso usándolo."
        fi
    fi
}

# ---------- 1. Node.js + npm ----------
if ! command_exists node; then
    echo ">>> Node.js no está instalado. Instalando Node.js $NODE_MAJOR LTS..."
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash - || die "No se pudo agregar el repositorio de NodeSource."
    sudo apt-get install -y nodejs || die "Fallo la instalación de Node.js."
fi

if ! command_exists npm; then
    echo ">>> npm no está disponible. Reinstalando Node.js..."
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash - || die "No se pudo agregar el repositorio de NodeSource."
    sudo apt-get install -y nodejs || die "Fallo la instalación de Node.js."
fi

echo ">>> Versiones: Node $(node -v) | npm $(npm -v)"

# ---------- 2. PostgreSQL ----------
if ! command_exists psql; then
    echo ">>> PostgreSQL no está instalado. Instalando..."
    sudo apt-get update || die "Fallo 'apt-get update'."
    sudo apt-get install -y postgresql postgresql-contrib || die "Fallo la instalación de PostgreSQL."
fi

if ! pg_isready -q 2>/dev/null; then
    echo ">>> Iniciando servicio PostgreSQL..."
    sudo systemctl start postgresql 2>/dev/null || sudo service postgresql start 2>/dev/null || true
    sleep 2
fi

echo ">>> Configurando contraseña del usuario postgres..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE ROLE ${DB_USER} LOGIN SUPERUSER;" 2>/dev/null || true
sudo -u postgres psql -c "ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';" 2>/dev/null || true

# Asegurar autenticación por contraseña (evita error "peer authentication")
echo ">>> Verificando pg_hba.conf (autenticación por contraseña)..."
PGHBA=$(sudo -u postgres psql -t -A -c "SHOW hba_file;" 2>/dev/null | tr -d ' ')
if [ -n "$PGHBA" ] && [ -f "$PGHBA" ]; then
    if ! sudo grep -qE '^\s*host\s+all\s+all\s+(127\.0\.0\.1/32|::1/128)\s+(md5|scram-sha-256)' "$PGHBA"; then
        echo ">>> Configurando pg_hba.conf para usar contraseña..."
        sudo cp "$PGHBA" "$PGHBA.bak"
        sudo sed -i 's/^\(\s*host\s*all\s*all\s*127\.0\.0\.1\/32\s*\)peer\s*$/\1scram-sha-256/' "$PGHBA"
        sudo sed -i 's/^\(\s*host\s*all\s*all\s*::1\/128\s*\)peer\s*$/\1scram-sha-256/' "$PGHBA"
        sudo systemctl restart postgresql 2>/dev/null || sudo service postgresql restart 2>/dev/null || true
        sleep 2
    fi
else
    echo "ADVERTENCIA: no se pudo verificar pg_hba.conf. Si hay errores de autenticación, revisalo manualmente."
fi

echo ">>> Creando base de datos '${DB_NAME}' si no existe..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME};"
echo ">>> Base de datos lista."

check_port "$BACKEND_PORT"
check_port "$FRONTEND_PORT"

# ---------- 3. Backend ----------
cd "$(dirname "$0")/backend"

# Crear .env si no existe
if [ ! -f .env ]; then
    echo ">>> Creando backend/.env..."
    if command_exists openssl; then
        JWT_SECRET="controlar_$(openssl rand -hex 16)"
    else
        JWT_SECRET="controlar_energia_secret_key_$(date +%s)"
    fi
    cat > .env <<EOF
NODE_ENV=development
PORT=${BACKEND_PORT}
DB_HOST=localhost
DB_PORT=5432
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:${FRONTEND_PORT}
EOF
    echo ">>> .env creado."
fi

echo ">>> Instalando dependencias del backend..."
npm install || die "Fallo 'npm install' en el backend."

# Primera ejecución: crear tablas + datos semilla. En las siguientes, respetar los datos.
if [ ! -f .db-initialized ]; then
    echo ">>> Primera ejecución: creando tablas y cargando datos iniciales..."
    npm run db:reset || die "Fallo 'npm run db:reset'."
    touch .db-initialized
    echo ">>> Base de datos inicializada."
else
    echo ">>> Base de datos ya inicializada."
    echo "    Para resetearla: cd backend && npm run db:reset"
fi

echo ">>> Iniciando backend en el puerto ${BACKEND_PORT}..."
npm run dev &
BACKEND_PID=$!

# ---------- 4. Frontend ----------
cd ../frontend || die "No se encontró la carpeta frontend/."

if [ ! -f .env ]; then
    echo ">>> Creando frontend/.env..."
    echo "DISABLE_ESLINT_PLUGIN=true" > .env
fi

echo ">>> Instalando dependencias del frontend..."
npm install || die "Fallo 'npm install' en el frontend."

echo ">>> Iniciando frontend en el puerto ${FRONTEND_PORT}..."
npm start &
FRONTEND_PID=$!

echo ""
echo "============================================="
echo "  ControlAR Energía está corriendo!"
echo "  Frontend: http://localhost:${FRONTEND_PORT}"
echo "  Backend:  http://localhost:${BACKEND_PORT}"
echo "  Usuario demo: demo@controlar.com"
echo "  Contraseña: 123456"
echo "  Presioná Ctrl+C para detener todo."
echo "============================================="

wait "$BACKEND_PID" "$FRONTEND_PID"
