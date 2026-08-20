#!/bin/bash
# ============================================
#  ControlAR Energia - Setup automatico
#  Detecta la IP de la red, configura CORS,
#  instala dependencias y levanta
#  backend + frontend automaticamente.
#  Compatible con Ubuntu/Debian, macOS y WSL.
#  Funciona desde cualquier PC/Notebook de la red.
# ============================================

NODE_MAJOR=18
BACKEND_PORT=3001
FRONTEND_PORT=3000

echo "============================================="
echo "  ControlAR Energia - Setup automatico"
echo "============================================="

# ---------- Helpers ----------
command_exists() { command -v "$1" &> /dev/null; }

die() {
    echo ""
    echo "ERROR: $1" >&2
    echo "Presiona Enter para cerrar..."
    read -r _ || true
    exit 1
}

# Detectar entorno Windows nativo
case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*)
        echo ""
        echo "Estas en Windows nativo. Usá start.bat en su lugar."
        read -r -p "Presiona Enter para cerrar..." _
        exit 1
        ;;
esac

# Detectar IP de la red local
detect_ip() {
    local ip=""
    # Método 1: ruta a internet
    if command_exists ip; then
        ip=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+')
    fi
    # Método 2: hostname
    if [ -z "$ip" ]; then
        ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi
    # Método 3: ifconfig
    if [ -z "$ip" ]; then
        ip=$(ifconfig 2>/dev/null | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | awk '{print $2}' | head -1)
    fi
    # Método 4: macOS
    if [ -z "$ip" ]; then
        ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
    fi
    echo "${ip:-localhost}"
}

NETWORK_IP=$(detect_ip)

cleanup() {
    echo ""
    echo "Deteniendo servidores..."
    [ -n "${BACKEND_PID:-}" ] && kill "$BACKEND_PID" 2>/dev/null || true
    [ -n "${FRONTEND_PID:-}" ] && kill "$FRONTEND_PID" 2>/dev/null || true
    echo "Servidores detenidos."
}
trap cleanup EXIT INT TERM

check_port() {
    if command_exists ss; then
        if ss -tln 2>/dev/null | grep -q ":$1 "; then
            echo "AVISO: el puerto $1 ya esta en uso."
        fi
    elif command_exists lsof; then
        if lsof -i :"$1" -sTCP:LISTEN &>/dev/null; then
            echo "AVISO: el puerto $1 ya esta en uso."
        fi
    fi
}

# ---------- 1. Node.js + npm ----------
if ! command_exists node; then
    echo ">>> Node.js no esta instalado. Instalando Node.js $NODE_MAJOR LTS..."
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash - || die "No se pudo agregar el repositorio de NodeSource."
    sudo apt-get install -y nodejs || die "Fallo la instalacion de Node.js."
fi

if ! command_exists npm; then
    echo ">>> npm no esta disponible. Reinstalando Node.js..."
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash - || die "No se pudo agregar el repositorio de NodeSource."
    sudo apt-get install -y nodejs || die "Fallo la instalacion de Node.js."
fi

echo ">>> Versiones: Node $(node -v) | npm $(npm -v)"

# ---------- 2. Backend ----------
cd "$(dirname "$0")/backend"

# Crear .env si no existe (primera vez)
if [ ! -f .env ]; then
    echo ">>> Creando backend/.env con configuracion por defecto..."
    if command_exists openssl; then
        JWT_SECRET="controlar_$(openssl rand -hex 16)"
    else
        JWT_SECRET="controlar_energia_secret_key_$(date +%s)_$RANDOM"
    fi
    cat > .env <<EOF
NODE_ENV=development
PORT=${BACKEND_PORT}
DB_HOST=localhost
DB_PORT=5432
DB_NAME=controlar_energia
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:${FRONTEND_PORT}
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
EOF
    echo ">>> .env creado."
fi

# Actualizar CORS_ORIGIN con la IP de la red (para acceso desde otros dispositivos)
echo ">>> IP de red detectada: ${NETWORK_IP}"

CORS_VALUE="http://localhost:${FRONTEND_PORT},http://${NETWORK_IP}:${FRONTEND_PORT},http://${NETWORK_IP}:${BACKEND_PORT}"

if grep -q "^CORS_ORIGIN=" .env; then
    sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=${CORS_VALUE}|" .env
else
    echo "CORS_ORIGIN=${CORS_VALUE}" >> .env
fi
echo ">>> CORS configurado para: $CORS_VALUE"

# Si tiene DB_HOST=localhost y no tiene Supabase, instalar PostgreSQL local
if grep -q "^DB_HOST=localhost" .env && ! grep -q "supabase" .env; then
    if ! command_exists psql; then
        echo ">>> PostgreSQL no esta instalado. Instalando..."
        sudo apt-get update || die "Fallo 'apt-get update'."
        sudo apt-get install -y postgresql postgresql-contrib || die "Fallo la instalacion de PostgreSQL."
    fi

    if ! pg_isready -q 2>/dev/null; then
        echo ">>> Iniciando servicio PostgreSQL..."
        sudo systemctl start postgresql 2>/dev/null || sudo service postgresql start 2>/dev/null || true
        sleep 2
    fi

    DB_USER=$(grep "^DB_USER=" .env | cut -d= -f2)
    DB_PASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d= -f2)
    DB_NAME=$(grep "^DB_NAME=" .env | cut -d= -f2)

    echo ">>> Configurando usuario postgres..."
    sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
        sudo -u postgres psql -c "CREATE ROLE ${DB_USER} LOGIN SUPERUSER;" 2>/dev/null || true
    sudo -u postgres psql -c "ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';" 2>/dev/null || true

    echo ">>> Verificando pg_hba.conf..."
    PGHBA=$(sudo -u postgres psql -t -A -c "SHOW hba_file;" 2>/dev/null | tr -d ' ')
    if [ -n "$PGHBA" ] && [ -f "$PGHBA" ]; then
        if ! sudo grep -qE '^\s*host\s+all\s+all\s+(127\.0\.0\.1/32|::1/128)\s+(md5|scram-sha-256)' "$PGHBA"; then
            sudo cp "$PGHBA" "$PGHBA.bak"
            sudo sed -i 's/^\(\s*host\s*all\s*all\s*127\.0\.0\.1\/32\s*\)peer\s*$/\1scram-sha-256/' "$PGHBA"
            sudo sed -i 's/^\(\s*host\s*all\s*all\s*::1\/128\s*\)peer\s*$/\1scram-sha-256/' "$PGHBA"
            sudo systemctl restart postgresql 2>/dev/null || sudo service postgresql restart 2>/dev/null || true
            sleep 2
        fi
    fi

    echo ">>> Creando base de datos '${DB_NAME}' si no existe..."
    sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
        sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME};"
fi

check_port "$BACKEND_PORT"
check_port "$FRONTEND_PORT"

echo ">>> Instalando dependencias del backend..."
npm install || die "Fallo 'npm install' en el backend."

# Primera ejecucion: crear tablas + datos semilla
if [ ! -f .db-initialized ]; then
    echo ">>> Primera ejecucion: creando tablas y cargando datos iniciales..."
    npm run db:reset || die "Fallo 'npm run db:reset'."
    touch .db-initialized
    echo ">>> Base de datos inicializada."
else
    echo ">>> Base de datos ya inicializada."
fi

echo ">>> Iniciando backend en el puerto ${BACKEND_PORT} (0.0.0.0)..."
npm run dev &
BACKEND_PID=$!

# Esperar a que el backend este listo
echo ">>> Esperando a que el backend arranque..."
for i in $(seq 1 30); do
    if curl -s "http://localhost:${BACKEND_PORT}/api/health" > /dev/null 2>&1; then
        echo ">>> Backend listo."
        break
    fi
    sleep 1
done

# ---------- 3. Frontend ----------
cd ../frontend || die "No se encontro la carpeta frontend/."

# Crear .env del frontend
cat > .env <<EOF
DISABLE_ESLINT_PLUGIN=true
REACT_APP_BACKEND_URL=http://${NETWORK_IP}:${BACKEND_PORT}
EOF
echo ">>> Frontend .env configurado (backend: http://${NETWORK_IP}:${BACKEND_PORT})"

echo ">>> Instalando dependencias del frontend..."
npm install || die "Fallo 'npm install' en el frontend."

echo ">>> Iniciando frontend en el puerto ${FRONTEND_PORT}..."
BROWSER=none npm start &
FRONTEND_PID=$!

# Esperar a que el frontend este listo
echo ">>> Esperando a que el frontend arranque..."
for i in $(seq 1 30); do
    if curl -s "http://localhost:${FRONTEND_PORT}" > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

echo ""
echo "============================================="
echo "  ControlAR Energia esta corriendo!"
echo ""
echo "  Desde esta maquina:"
echo "    Frontend: http://localhost:${FRONTEND_PORT}"
echo "    Backend:  http://localhost:${BACKEND_PORT}"
echo ""
echo "  Desde otros dispositivos en la red:"
echo "    Frontend: http://${NETWORK_IP}:${FRONTEND_PORT}"
echo "    Backend:  http://${NETWORK_IP}:${BACKEND_PORT}"
echo ""
echo "  API Health: http://${NETWORK_IP}:${BACKEND_PORT}/api/health"
echo ""
echo "  Usuario demo: demo@controlar.com"
echo "  Contrasena:   123456"
echo ""
echo "  Presiona Ctrl+C para detener todo."
echo "============================================="

wait "$BACKEND_PID" "$FRONTEND_PID"
