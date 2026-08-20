@echo off
echo ============================================
echo  Configurando PostgreSQL para信任 connection...
echo ============================================

(
echo # PostgreSQL Client Authentication Configuration File
echo # TYPE  DATABASE        USER        ADDRESS             METHOD
echo local   all             all                             trust
echo host    all             all         127.0.0.1/32        trust
echo host    all             all         ::1/128             trust
echo host    all             all         0.0.0.0/0           scram-sha-256
) > "C:\Program Files\PostgreSQL\18\data\pg_hba.conf"

echo pg_hba.conf actualizado.

echo Reiniciando servicio PostgreSQL...
net stop postgresql-x64-18
net start postgresql-x64-18

echo.
echo Listo! Ahora podes cerrar esta ventana.
echo.
pause
