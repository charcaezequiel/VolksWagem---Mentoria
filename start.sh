#!/bin/bash
set -e

echo "=== ControlAR Energía - Setup ==="

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "Error: PostgreSQL no está instalado. Instalalo con: sudo apt install postgresql"
    exit 1
fi

# Create database if it doesn't exist
echo "Verificando base de datos..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='controlar_energia'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE controlar_energia;"
echo "Base de datos lista."

# Backend setup
echo "Instalando dependencias del backend..."
cd backend && npm install

# Seed database
echo "Cargando datos iniciales..."
npm run db:reset

echo "Iniciando backend en puerto 3001..."
npm run dev &
BACKEND_PID=$!

# Frontend setup
echo "Instalando dependencias del frontend..."
cd ../frontend && npm install

echo "Iniciando frontend en puerto 3000..."
npm start &
FRONTEND_PID=$!

echo ""
echo "========================================="
echo "  ControlAR Energía está corriendo!"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:3001"
echo "  Usuario demo: demo@controlar.com"
echo "  Contraseña: 123456"
echo "========================================="

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
